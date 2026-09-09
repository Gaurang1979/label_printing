import frappe


def after_install():
    for role in ['Label Printing User', 'Label Printing Manager', 'Label Printing Administrator']:
        if not frappe.db.exists('Role', role):
            frappe.get_doc({'doctype':'Role','role_name':role,'desk_access':1}).insert(ignore_permissions=True)
    frappe.db.commit()


def remove_printing_workspace_shortcuts():
    """Remove Label Printing shortcuts that were previously added to the global Printing workspace."""
    if not frappe.db.exists('Workspace', 'Printing'):
        return
    workspace = frappe.get_doc('Workspace', 'Printing')
    remove = {
        'Label Template', 'Label Template Object', 'Manage Printer',
        'Label Print Job', 'Label Print Job Item', 'Label Print Log'
    }
    changed = False
    for row in list(workspace.shortcuts):
        if row.link_to in remove:
            workspace.remove(row)
            changed = True
    if changed:
        workspace.save(ignore_permissions=True)
