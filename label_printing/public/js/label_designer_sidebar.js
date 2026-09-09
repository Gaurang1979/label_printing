$(document).off('click.label_printing_sidebar').on('click.label_printing_sidebar', '.lp-side-link', function(e) {
    e.preventDefault();
    const route = $(this).attr('data-route');
    if (route === 'label-designer') {
        frappe.set_route('label-designer');
        return;
    }
    const map = {
        'label-template': 'Label Template',
        'manage-printer': 'Manage Printer',
        'label-print-job': 'Label Print Job',
        'label-print-log': 'Label Print Log',
        'label-template-object': 'Label Template Object'
    };
    if (map[route]) frappe.set_route('List', map[route]);
});
