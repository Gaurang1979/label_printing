frappe.ui.form.on('Label Template', {
    refresh(frm) {
        if (frm.doc.source_doctype) label_printing.load_child_tables(frm);
        if (!frm.is_new()) {
            frm.add_custom_button(__('Open Designer'), () => frappe.set_route('label-designer', frm.doc.name), __('Design'));
            frm.add_custom_button(__('Validate Layout'), () => label_printing.validate_layout(frm), __('Design'));
        }
    },
    source_doctype(frm) {
        frm.set_value('source_child_table', '');
        label_printing.load_child_tables(frm);
    },
    source_child_table(frm) {
        label_printing.refresh_designer_fields(frm);
    },
    printer(frm) {
        label_printing.validate_printer_width(frm);
    },
    label_width_mm(frm) {
        label_printing.validate_printer_width(frm);
    },
    label_height_mm(frm) {
        label_printing.validate_printer_width(frm);
    }
});

label_printing.load_child_tables = function(frm) {
    if (!frm.doc.source_doctype) return;
    frappe.call({
        method: 'label_printing.api.get_child_tables',
        args: {doctype: frm.doc.source_doctype},
        callback(r) {
            const rows = r.message || [];
            const options = [''].concat(rows.map(x => x.value));
            frm.set_df_property('source_child_table', 'options', options.join('\n'));
            frm.refresh_field('source_child_table');
            if (rows.length === 1 && !frm.doc.source_child_table) frm.set_value('source_child_table', rows[0].value);
        }
    });
};

label_printing.refresh_designer_fields = function(frm) {
    if (!frm.doc.source_doctype) return;
    frappe.call({
        method: 'label_printing.api.get_doctype_fields',
        args: {doctype: frm.doc.source_doctype, child_table: frm.doc.source_child_table || null},
        callback(r) {
            frm.__label_printing_fields = r.message || [];
        }
    });
};

label_printing.validate_printer_width = function(frm) {
    if (!frm.doc.printer || !frm.doc.label_width_mm) return;
    frappe.db.get_value('Manage Printer', frm.doc.printer, 'maximum_print_width_mm', r => {
        const max_width = flt(r.message && r.message.maximum_print_width_mm);
        if (max_width && flt(frm.doc.label_width_mm) > max_width) {
            frappe.msgprint({title: __('Label Width Exceeds Printer Capability'), indicator: 'red', message: __('Template width {0} mm exceeds printer maximum printable width {1} mm.', [frm.doc.label_width_mm, max_width])});
        }
    });
};

label_printing.validate_layout = function(frm) {
    const w = flt(frm.doc.label_width_mm), h = flt(frm.doc.label_height_mm), errors = [];
    if (!w || !h) errors.push(__('Label Width and Label Height are required.'));
    if (flt(frm.doc.number_of_ups) < 1) errors.push(__('Number of Ups must be at least 1.'));
    (frm.doc.objects || []).forEach((o, i) => {
        if (flt(o.x_mm) < 0 || flt(o.y_mm) < 0) errors.push(__('Object {0}: X/Y cannot be negative.', [i + 1]));
        if (flt(o.x_mm) + flt(o.width_mm) > w || flt(o.y_mm) + flt(o.height_mm) > h) errors.push(__('Object {0}: outside label bounds.', [i + 1]));
        if (['DataMatrix','QR Code','PDF417','Aztec'].includes(o.object_type) && flt(o.width_mm) < 8) errors.push(__('Object {0}: 2D code is very small.', [i + 1]));
        if (['Text','Barcode','DataMatrix','QR Code','PDF417','Aztec'].includes(o.object_type) && !o.fieldname && !o.fixed_text) errors.push(__('Object {0}: map an ERPNext field or enter a fixed value.', [i + 1]));
    });
    frappe.msgprint({title: errors.length ? __('Layout Warnings') : __('Layout Valid'), indicator: errors.length ? 'orange' : 'green', message: errors.length ? errors.join('<br>') : __('No obvious layout errors were found.')});
};
