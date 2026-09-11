// Thin page wrapper around the shared designer engine (label_designer_core.js).
// All canvas/toolbar/keyboard logic lives there, reused by the Label
// Template form's own embedded Design tab.
frappe.pages['label-designer'].on_page_load = function (wrapper) {
    frappe.ui.make_app_page({ parent: wrapper, title: __('Label Designer'), single_column: true });
    const $root = $(wrapper).find('.layout-main-section');
    label_printing.mount_designer($root, {
        mode: 'standalone',
        template_name: frappe.get_route()[1] || '',
        ns: 'label_printing_designer_page',
        on_navigate: (name) => frappe.set_route('label-designer', name),
    });
};
