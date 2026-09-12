frappe.ui.form.on('Label Template', {
    setup(frm) {
        label_printing.ensure_template_styles();
        frm.set_query('source_doctype', () => ({filters: {istable: 0, issingle: 0}}));
        frm.set_query('source_child_doctype', () => ({
            query: 'label_printing.api.child_doctype_query',
            filters: {parent_doctype: frm.doc.source_doctype},
        }));
    },
    refresh(frm) {
        label_printing.setup_designer_tab(frm);
        if (!frm.is_new()) {
            frm.add_custom_button(__('Validate Layout'), () => label_printing.validate_layout(frm), __('Design'));
        }
    },
    source_doctype(frm) {
        frm.set_value('source_child_doctype', '');
        frm.set_value('source_child_table', '');
        if (!frm.doc.source_doctype) return;
        // Convenience only: auto-fill when there is exactly one child table.
        // The dropdown itself is always filtered server-side (see setup above).
        frappe.call({
            method: 'label_printing.api.get_child_doctypes',
            args: {parent_doctype: frm.doc.source_doctype},
            callback(r) {
                const rows = r.message || [];
                if (rows.length === 1) {
                    frm.set_value('source_child_doctype', rows[0].value);
                    frm.set_value('source_child_table', rows[0].fieldname);
                }
            }
        });
    },
    source_child_doctype(frm) {
        if (!frm.doc.source_child_doctype) { frm.set_value('source_child_table', ''); label_printing.refresh_designer_if_ready(frm); return; }
        frappe.call({
            method: 'label_printing.api.get_child_doctypes',
            args: {parent_doctype: frm.doc.source_doctype},
            callback(r) {
                const row = (r.message || []).find(x => x.value === frm.doc.source_child_doctype);
                frm.set_value('source_child_table', row ? row.fieldname : '');
                label_printing.refresh_designer_if_ready(frm);
            }
        });
    },
    printer(frm) { label_printing.validate_printer_width(frm); },
    label_width_mm(frm) { label_printing.validate_printer_width(frm); label_printing.refresh_designer_if_ready(frm); },
    label_height_mm(frm) { label_printing.validate_printer_width(frm); label_printing.refresh_designer_if_ready(frm); }
});

label_printing.ensure_template_styles = function() {
    if (document.getElementById('label-printing-template-styles')) return;
    const style = document.createElement('style');
    style.id = 'label-printing-template-styles';
    style.textContent = `
        .lp-designer-message{padding:24px;text-align:center;border:1px dashed var(--border-color);border-radius:6px;color:var(--text-muted);background:var(--subtle-fg)}
    `;
    document.head.appendChild(style);
};

label_printing.setup_designer_tab = function(frm) {
    const field = frm.fields_dict && frm.fields_dict.designer_embed;
    if (!field) return;
    if (frm.is_new()) {
        frm.set_df_property('designer_embed', 'options', `<div class="lp-designer-message">${__('Save the Label Template first to open the full designer.')}</div>`);
        frm.refresh_field('designer_embed');
        frm.__lp_designer_mounted_for = null;
        return;
    }
    if (frm.__lp_designer_mounted_for === frm.doc.name && frm.__lp_designer_handle && field.$wrapper.find('.lp-designer').length) {
        return; // already mounted for this document, and still actually there -- don't reset zoom/undo/selection on every refresh
    }
    frm.__lp_designer_mounted_for = frm.doc.name;
    try {
        frm.__lp_designer_handle = label_printing.mount_designer(field.$wrapper, {
            ns: 'label_printing_designer_embed',
            get_doc: () => frm.doc,
            get_fields: () => new Promise(resolve => frappe.call({
                method: 'label_printing.api.get_doctype_fields',
                args: {doctype: frm.doc.source_child_doctype},
                callback: r => resolve(r.message || []),
            })),
            new_row: (values) => frm.add_child('objects', values),
            on_dirty: () => { frm.dirty(); frm.refresh_field('objects'); },
        });
        // Frappe's own ControlHTML.refresh_input() unconditionally re-renders
        // this field from df.options on every subsequent field-refresh cycle
        // (independent of the guard above), which would otherwise wipe out
        // the mounted designer and replace it with the stale placeholder
        // text. Disable it now that we own this field's content.
        field.refresh_input = function () {};
    } catch (e) {
        console.error(e);
        field.$wrapper.html(`<div class="lp-designer-message" style="color:var(--red-600,#c0392b);text-align:left;white-space:pre-wrap">${__('The designer failed to load.')}\n\n${frappe.utils.escape_html(e && e.stack || e)}</div>`);
        frm.__lp_designer_mounted_for = null;
    }
};

label_printing.refresh_designer_if_ready = function(frm) {
    if (frm.__lp_designer_handle) frm.__lp_designer_handle.refresh();
};

label_printing.validate_printer_width = function(frm) {
    if (!frm.doc.printer || !frm.doc.label_width_mm) return;
    frappe.db.get_value('Manage Printer', frm.doc.printer, 'maximum_print_width_mm', r => {
        const max_width = flt(r.message && r.message.maximum_print_width_mm);
        if (max_width && flt(frm.doc.label_width_mm) > max_width) frappe.msgprint({title:__('Label Width Exceeds Printer Capability'),indicator:'red',message:__('Template width {0} mm exceeds printer maximum printable width {1} mm.',[frm.doc.label_width_mm,max_width])});
    });
};

label_printing.validate_layout = function(frm) {
    const w=flt(frm.doc.label_width_mm), h=flt(frm.doc.label_height_mm), errors=[];
    if (!w || !h) errors.push(__('Label Width and Label Height are required.'));
    if (flt(frm.doc.number_of_ups)<1) errors.push(__('Number of Ups must be at least 1.'));
    (frm.doc.objects||[]).forEach((o,i)=>{
        if(flt(o.x_mm)<0||flt(o.y_mm)<0) errors.push(__('Object {0}: X/Y cannot be negative.',[i+1]));
        if(flt(o.x_mm)+flt(o.width_mm)>w||flt(o.y_mm)+flt(o.height_mm)>h) errors.push(__('Object {0}: outside label bounds.',[i+1]));
        if(['Text','Barcode','DataMatrix','QR Code','PDF417','Aztec'].includes(o.object_type)&&!o.fieldname&&!o.fixed_text) errors.push(__('Object {0}: map an ERPNext field or enter a fixed value.',[i+1]));
    });
    frappe.msgprint({title:errors.length?__('Layout Warnings'):__('Layout Valid'),indicator:errors.length?'orange':'green',message:errors.length?errors.join('<br>'):__('No obvious layout errors were found.')});
};
