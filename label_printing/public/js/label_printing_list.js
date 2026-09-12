// Shared across every Label Printing doctype's list view (see
// doctype_list_js in hooks.py). Adds a reliable, code-guaranteed button to
// the Print Label tool -- not dependent on a workspace shortcut being set
// up, so it always works regardless of whether that manual step was done.
['Label Template', 'Manage Printer', 'Label Print Job', 'Label Print Log'].forEach(function (doctype) {
    frappe.listview_settings[doctype] = frappe.listview_settings[doctype] || {};
    const existing_onload = frappe.listview_settings[doctype].onload;
    frappe.listview_settings[doctype].onload = function (listview) {
        if (existing_onload) existing_onload(listview);
        listview.page.add_inner_button(__('Open Print Label'), () => frappe.set_route('print-label'));
    };
});
