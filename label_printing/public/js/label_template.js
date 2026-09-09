frappe.ui.form.on('Label Template', {
    refresh(frm) {
        frm.set_query('source_child_doctype', () => ({filters: {istable: 1}}));
        label_printing.refresh_child_doctype(frm);
        if (!frm.is_new()) {
            frm.add_custom_button(__('Open Designer'), () => frappe.set_route('label-designer', frm.doc.name), __('Design'));
            frm.add_custom_button(__('Validate Layout'), () => label_printing.validate_layout(frm), __('Design'));
        }
    },
    source_child_doctype(frm) { label_printing.load_child_doctype(frm); },
    printer(frm) { label_printing.validate_printer_width(frm); },
    label_width_mm(frm) { label_printing.validate_printer_width(frm); },
    label_height_mm(frm) { label_printing.validate_printer_width(frm); }
});

label_printing.load_child_doctype = function(frm) {
    const child = frm.doc.source_child_doctype;
    if (!child) {
        frm.set_value('source_doctype', '');
        frm.set_value('source_child_table', '');
        label_printing.show_child_fields(frm, []);
        return;
    }
    frappe.call({
        method: 'label_printing.api.get_child_doctype_info',
        args: {doctype: child},
        callback(r) {
            const info = r.message;
            if (!info) return;
            const parents = info.parents || [];
            if (parents.length) {
                frm.set_value('source_doctype', parents[0].parent);
                frm.set_value('source_child_table', parents[0].fieldname);
            } else {
                frm.set_value('source_doctype', '');
                frm.set_value('source_child_table', '');
            }
            const fields = (info.fields || []).map(f => ({value:f.value, label:f.label, fieldtype:f.fieldtype, group:'Label Data'}));
            frm.__label_printing_fields = fields;
            label_printing.show_child_fields(frm, fields);
        }
    });
};

label_printing.refresh_child_doctype = function(frm) {
    if (frm.doc.source_child_doctype) label_printing.load_child_doctype(frm);
    else label_printing.show_child_fields(frm, []);
};

label_printing.show_child_fields = function(frm, fields) {
    if (!frm.fields_dict || !frm.fields_dict.designer_hint) return;
    const child = frm.doc.source_child_doctype || '';
    let html = `<div style="padding:10px;border:1px solid var(--border-color);border-radius:6px;background:var(--subtle-fg);">`;
    html += `<div style="font-weight:600;margin-bottom:5px;">${__('Label Fields')}</div>`;
    if (!child) html += `<div class="text-muted">${__('Select a Label Data / Child DocType above.')}</div>`;
    else if (!(fields || []).length) html += `<div class="text-muted">${__('No fields found.')}</div>`;
    else {
        html += `<div class="text-muted" style="margin-bottom:7px;">${frappe.utils.escape_html(child)} — ${__('Click Copy to copy a field name.')}</div>`;
        html += '<div style="display:grid;grid-template-columns:minmax(0,1fr) auto;gap:4px 8px;">';
        (fields || []).forEach(f => {
            const value = frappe.utils.escape_html(f.value), label = frappe.utils.escape_html(f.label || f.value);
            html += `<div style="padding:4px 6px;background:var(--card-bg);border:1px solid var(--border-color);border-radius:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${label}">${label} <span class="text-muted">(${value})</span></div>`;
            html += `<button type="button" class="btn btn-xs btn-default lp-copy-field" data-field="${value}">${__('Copy')}</button>`;
        });
        html += '</div>';
    }
    html += '</div>';
    frm.set_df_property('designer_hint', 'options', html);
    frm.refresh_field('designer_hint');
    const $wrapper = $(frm.fields_dict.designer_hint.wrapper);
    $wrapper.off('click.label_printing_copy').on('click.label_printing_copy', '.lp-copy-field', function() {
        const fieldname = $(this).attr('data-field'), button = $(this);
        const done = () => { const old = button.text(); button.text(__('Copied')); setTimeout(() => button.text(old), 1000); };
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(fieldname).then(done).catch(() => label_printing.copy_field_fallback(fieldname, done));
        else label_printing.copy_field_fallback(fieldname, done);
    });
};

label_printing.copy_field_fallback = function(text, done) {
    const ta = document.createElement('textarea'); ta.value = text; ta.style.position='fixed'; ta.style.opacity='0';
    document.body.appendChild(ta); ta.focus(); ta.select();
    try { document.execCommand('copy'); if (done) done(); } finally { document.body.removeChild(ta); }
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
