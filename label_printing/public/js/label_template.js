frappe.ui.form.on('Label Template', {
    refresh(frm) {
        if (frm.doc.source_doctype) label_printing.load_child_tables(frm, true);
        else label_printing.show_child_fields(frm, []);
        if (!frm.is_new()) {
            frm.add_custom_button(__('Open Designer'), () => frappe.set_route('label-designer', frm.doc.name), __('Design'));
            frm.add_custom_button(__('Validate Layout'), () => label_printing.validate_layout(frm), __('Design'));
        }
    },
    source_doctype(frm) {
        frm.set_value('source_child_table', '');
        label_printing.load_child_tables(frm, true);
    },
    source_child_table(frm) {
        label_printing.refresh_designer_fields(frm);
    },
    printer(frm) { label_printing.validate_printer_width(frm); },
    label_width_mm(frm) { label_printing.validate_printer_width(frm); },
    label_height_mm(frm) { label_printing.validate_printer_width(frm); }
});

label_printing.load_child_tables = function(frm, auto_select) {
    if (!frm.doc.source_doctype) {
        frm.set_df_property('source_child_table', 'options', [{value: '', label: __('Select ERPNext DocType first')}]);
        frm.refresh_field('source_child_table');
        label_printing.show_child_fields(frm, []);
        return;
    }

    frappe.call({
        method: 'label_printing.api.get_child_tables',
        args: {doctype: frm.doc.source_doctype},
        callback(r) {
            const rows = r.message || [];
            const options = rows.map(x => ({
                value: x.value,
                label: x.display || `${x.label} (${x.child_doctype || x.options})`
            }));

            // Frappe v16 Select supports {value, label} options.
            frm.set_df_property('source_child_table', 'options', options);
            frm.refresh_field('source_child_table');

            if (!rows.length) {
                label_printing.show_child_fields(frm, []);
                frappe.show_alert({message: __('No child table found in {0}', [frm.doc.source_doctype]), indicator: 'orange'});
                return;
            }

            const current = frm.doc.source_child_table;
            if (auto_select && (!current || !rows.some(x => x.value === current))) {
                const preferred = rows.find(x => x.value === 'items') || rows[0];
                frm.set_value('source_child_table', preferred.value);
            } else if (current) {
                label_printing.refresh_designer_fields(frm);
            }
        }
    });
};

label_printing.refresh_designer_fields = function(frm) {
    if (!frm.doc.source_doctype || !frm.doc.source_child_table) {
        frm.__label_printing_fields = [];
        label_printing.show_child_fields(frm, []);
        return;
    }

    frappe.call({
        method: 'label_printing.api.get_doctype_fields',
        args: {doctype: frm.doc.source_doctype, child_table: frm.doc.source_child_table},
        callback(r) {
            frm.__label_printing_fields = r.message || [];
            label_printing.show_child_fields(frm, frm.__label_printing_fields);
        }
    });
};

label_printing.show_child_fields = function(frm, fields) {
    if (!frm.fields_dict || !frm.fields_dict.designer_hint) return;

    const child_fields = (fields || []).filter(f => String(f.group || '').startsWith('Child ·'));
    const child_table = frm.doc.source_child_table || '';
    const child_title = child_fields.length ? (child_fields[0].group || '').replace(/^Child · /, '') : '';

    let html = `<div class="label-printing-field-panel" style="margin-top:8px;padding:10px;border:1px solid var(--border-color);border-radius:6px;background:var(--subtle-fg);">`;
    html += `<div style="font-weight:600;margin-bottom:4px;">${__('Child Table Fields')}</div>`;

    if (!child_table) {
        html += `<div class="text-muted">${__('Select an Item / Child Table to see its fields.')}</div></div>`;
    } else if (!child_fields.length) {
        html += `<div class="text-muted">${__('No printable fields found for {0}.', [child_title || child_table])}</div></div>`;
    } else {
        html += `<div class="text-muted" style="margin-bottom:7px;">${frappe.utils.escape_html(child_title || child_table)} — ${__('click Copy to copy the field name.')}</div>`;
        html += '<div style="display:grid;grid-template-columns:minmax(0,1fr) auto;gap:4px 8px;">';
        child_fields.forEach(f => {
            html += `<div style="padding:4px 6px;background:var(--card-bg);border:1px solid var(--border-color);border-radius:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${frappe.utils.escape_html(f.label || f.value)}">${frappe.utils.escape_html(f.label || f.value)} <span class="text-muted">(${frappe.utils.escape_html(f.value)})</span></div>`;
            html += `<button type="button" class="btn btn-xs btn-default lp-copy-field" data-field="${frappe.utils.escape_html(f.value)}">${__('Copy')}</button>`;
        });
        html += '</div></div>';
    }

    frm.set_df_property('designer_hint', 'options', html);
    frm.refresh_field('designer_hint');

    const $wrapper = $(frm.fields_dict.designer_hint.wrapper);
    $wrapper.off('click.label_printing_copy').on('click.label_printing_copy', '.lp-copy-field', function() {
        const fieldname = $(this).attr('data-field');
        const button = $(this);
        const done = () => {
            const old = button.text();
            button.text(__('Copied'));
            setTimeout(() => button.text(old), 1200);
        };
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(fieldname).then(done).catch(() => label_printing.copy_field_fallback(fieldname, done));
        } else {
            label_printing.copy_field_fallback(fieldname, done);
        }
    });
};

label_printing.copy_field_fallback = function(text, done) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.left = '-1000px';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); if (done) done(); } finally { document.body.removeChild(ta); }
};

label_printing.validate_printer_width = function(frm) {
    if (!frm.doc.printer || !frm.doc.label_width_mm) return;
    frappe.db.get_value('Manage Printer', frm.doc.printer, 'maximum_print_width_mm', r => {
        const max_width = flt(r.message && r.message.maximum_print_width_mm);
        if (max_width && flt(frm.doc.label_width_mm) > max_width) frappe.msgprint({title: __('Label Width Exceeds Printer Capability'), indicator: 'red', message: __('Template width {0} mm exceeds printer maximum printable width {1} mm.', [frm.doc.label_width_mm, max_width])});
    });
};

label_printing.validate_layout = function(frm) {
    const w = flt(frm.doc.label_width_mm), h = flt(frm.doc.label_height_mm), errors = [];
    if (!w || !h) errors.push(__('Label Width and Label Height are required.'));
    if (flt(frm.doc.number_of_ups) < 1) errors.push(__('Number of Ups must be at least 1.'));
    (frm.doc.objects || []).forEach((o, i) => {
        if (flt(o.x_mm) < 0 || flt(o.y_mm) < 0) errors.push(__('Object {0}: X/Y cannot be negative.', [i + 1]));
        if (flt(o.x_mm) + flt(o.width_mm) > w || flt(o.y_mm) + flt(o.height_mm) > h) errors.push(__('Object {0}: outside label bounds.', [i + 1]));
        if (['Text','Barcode','DataMatrix','QR Code','PDF417','Aztec'].includes(o.object_type) && !o.fieldname && !o.fixed_text) errors.push(__('Object {0}: map an ERPNext field or enter a fixed value.', [i + 1]));
    });
    frappe.msgprint({title: errors.length ? __('Layout Warnings') : __('Layout Valid'), indicator: errors.length ? 'orange' : 'green', message: errors.length ? errors.join('<br>') : __('No obvious layout errors were found.')});
};
