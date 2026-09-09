frappe.ui.form.on('Label Template', {
    setup(frm) {
        label_printing.ensure_template_styles();
        frm.set_query('source_child_doctype', () => ({filters: {name: ['in', frm.__label_child_doctypes || []]}}));
    },
    refresh(frm) {
        label_printing.setup_designer_tab(frm);
        label_printing.refresh_child_doctype(frm);
        label_printing.load_designer_fields(frm);
        if (!frm.is_new()) {
            frm.add_custom_button(__('Open Designer'), () => frappe.set_route('label-designer', frm.doc.name), __('Design'));
            frm.add_custom_button(__('Validate Layout'), () => label_printing.validate_layout(frm), __('Design'));
        }
    },
    source_doctype(frm) {
        frm.set_value('source_child_doctype', '');
        frm.set_value('source_child_table', '');
        frm.__label_child_doctypes = [];
        frm.set_query('source_child_doctype', () => ({filters: {name: ['in', frm.__label_child_doctypes || []]}}));
        if (!frm.doc.source_doctype) { label_printing.load_designer_fields(frm); return; }
        frappe.call({
            method: 'label_printing.api.get_child_doctypes',
            args: {parent_doctype: frm.doc.source_doctype},
            callback(r) {
                const rows = r.message || [];
                frm.__label_child_doctypes = rows.map(x => x.value);
                frm.__label_child_rows = rows;
                frm.set_query('source_child_doctype', () => ({filters: {name: ['in', frm.__label_child_doctypes]}}));
                frm.refresh_field('source_child_doctype');
                if (rows.length === 1) {
                    frm.set_value('source_child_doctype', rows[0].value);
                    frm.set_value('source_child_table', rows[0].fieldname);
                }
            }
        });
        label_printing.load_designer_fields(frm);
    },
    source_child_doctype(frm) {
        const row = (frm.__label_child_rows || []).find(x => x.value === frm.doc.source_child_doctype);
        frm.set_value('source_child_table', row ? row.fieldname : '');
        label_printing.load_designer_fields(frm);
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
        .lp-designer-frame{display:block;width:100%;height:calc(100vh - 300px);min-height:760px;border:1px solid var(--border-color);border-radius:6px;background:var(--card-bg)}
        .lp-designer-message{padding:24px;text-align:center;border:1px dashed var(--border-color);border-radius:6px;color:var(--text-muted);background:var(--subtle-fg)}
        .lp-template-fields{margin-top:12px;border:1px solid var(--border-color);border-radius:6px;overflow:hidden;background:var(--card-bg)}
        .lp-template-fields-title{padding:8px 10px;font-weight:600;border-bottom:1px solid var(--border-color)}
        .lp-template-fields-grid{display:grid;grid-template-columns:minmax(180px,1fr) minmax(160px,1fr) 110px;gap:0;border-bottom:1px solid var(--border-color)}
        .lp-template-fields-grid>div{padding:6px 8px;border-right:1px solid var(--border-color);font-size:12px}
        .lp-template-fields-grid>div:last-child{border-right:0}
        @media(max-width:900px){.lp-template-fields-grid{grid-template-columns:1fr}.lp-template-fields-grid>div{border-right:0}}
    `;
    document.head.appendChild(style);
};

label_printing.refresh_child_doctype = function(frm) {
    frm.__label_child_doctypes = [];
    if (!frm.doc.source_doctype) {
        frm.set_query('source_child_doctype', () => ({filters: {name: ['in', []]}}));
        return;
    }
    frappe.call({
        method: 'label_printing.api.get_child_doctypes',
        args: {parent_doctype: frm.doc.source_doctype},
        callback(r) {
            const rows = r.message || [];
            frm.__label_child_doctypes = rows.map(x => x.value);
            frm.__label_child_rows = rows;
            frm.set_query('source_child_doctype', () => ({filters: {name: ['in', frm.__label_child_doctypes]}}));
            frm.refresh_field('source_child_doctype');
            if (frm.doc.source_child_doctype && !frm.__label_child_doctypes.includes(frm.doc.source_child_doctype)) {
                frm.set_value('source_child_doctype', '');
                frm.set_value('source_child_table', '');
            }
        }
    });
};

label_printing.load_designer_fields = function(frm) {
    if (!frm.doc.source_child_doctype) {
        label_printing.render_designer_field_table(frm, []);
        return;
    }
    frappe.call({
        method: 'label_printing.api.get_doctype_fields',
        args: {doctype: frm.doc.source_child_doctype},
        callback(r) {
            const fields = r.message || [];
            frm.__label_printing_fields = fields;
            label_printing.render_designer_field_table(frm, fields);
            label_printing.refresh_designer_if_ready(frm);
        }
    });
};

label_printing.render_designer_field_table = function(frm, fields) {
    const field = frm.fields_dict && frm.fields_dict.designer_fields;
    if (!field) return;
    let html = `<div class="lp-template-fields"><div class="lp-template-fields-title">${__('Available Label Fields')}</div>`;
    if (!fields.length) html += `<div class="text-muted" style="padding:8px">${__('Select Parent ERPNext DocType and then a child table DocType.')}</div>`;
    else {
        html += `<div class="lp-template-fields-grid"><div>${__('Label')}</div><div>${__('Fieldname')}</div><div>${__('Type')}</div></div>`;
        fields.forEach(f => {
            html += `<div class="lp-template-fields-grid"><div>${frappe.utils.escape_html(f.label || f.value)}</div><div><code>${frappe.utils.escape_html(f.value)}</code></div><div>${frappe.utils.escape_html(f.fieldtype || '')}</div></div>`;
        });
    }
    html += '</div>';
    frm.set_df_property('designer_fields', 'options', html);
    frm.refresh_field('designer_fields');
};

label_printing.setup_designer_tab = function(frm) {
    const field = frm.fields_dict && frm.fields_dict.designer_embed;
    if (!field) return;
    if (frm.is_new()) {
        frm.set_df_property('designer_embed', 'options', `<div class="lp-designer-message">${__('Save the Label Template first to open the full designer.')}</div>`);
        return;
    }
    const base = frappe.urllib.get_base_url ? frappe.urllib.get_base_url() : window.location.origin;
    const src = `${base}/desk/label-designer/${encodeURIComponent(frm.doc.name)}`;
    frm.set_df_property('designer_embed', 'options', `<iframe class="lp-designer-frame" src="${src}" title="${__('Label Designer')}" loading="eager"></iframe>`);
    frm.refresh_field('designer_embed');
};

label_printing.refresh_designer_if_ready = function(frm) {
    if (!frm.is_new() && frm.fields_dict && frm.fields_dict.designer_embed) label_printing.setup_designer_tab(frm);
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
