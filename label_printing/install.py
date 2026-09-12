import frappe


def after_install():
    for role in ['Label Printing User', 'Label Printing Manager', 'Label Printing Administrator']:
        if not frappe.db.exists('Role', role):
            frappe.get_doc({'doctype': 'Role', 'role_name': role, 'desk_access': 1}).insert(ignore_permissions=True)
    frappe.db.commit()


def remove_orphaned_designer_page():
    """The standalone Label Designer page was merged into the Label
    Template form's own Design tab, and its files were deleted -- but
    deleting an app's files does not delete the matching Page record
    from the database. Without this, 'label-designer' would keep
    showing up as a leftover entry (e.g. in module/doctype listings)
    even though the page itself no longer exists. Runs on every migrate,
    defensively, in case anything ever recreates it."""
    try:
        if frappe.db.exists('Page', 'label-designer'):
            frappe.delete_doc('Page', 'label-designer', ignore_permissions=True, force=True)
            frappe.db.commit()
    except Exception:
        frappe.log_error(frappe.get_traceback(), 'Label Printing: could not remove orphaned label-designer page')


def ensure_label_printing_workspace():
    """Ensure a Label Printing workspace record exists, nested under
    Printing (parent_page='Printing') so it's reachable from Printing's
    own sidebar rather than as a separate top-level dashboard, and
    carrying module='Label Printing' -- which is what Frappe's
    breadcrumbs actually key off to link a document back to a workspace
    (frappe.boot.module_wise_workspaces, grouped by each workspace's own
    module field). Without a workspace carrying this module, Label
    Template / Manage Printer / etc. documents have no breadcrumb to
    link to at all.

    This deliberately only sets plain fields (title/module/parent_page/
    public/icon) -- not shortcuts or the content layout JSON. Those are
    better added the normal way, from Workspace > Edit in the browser
    (see the app README): Frappe's own drag-and-drop editor is what
    workspaces are designed to be customized with, and it's more
    reliable than this code trying to hand-write the same JSON.

    Runs on every migrate so the record (and its module link) survive
    future ERPNext updates even if something removes it."""
    try:
        if frappe.db.exists('Workspace', 'Label Printing'):
            workspace = frappe.get_doc('Workspace', 'Label Printing')
        else:
            workspace = frappe.new_doc('Workspace')
            workspace.title = 'Label Printing'
            workspace.label = 'Label Printing'
            workspace.content = '[{"type":"header","data":{"text":"<span class=\\"h4\\">Label Printing</span>","col":12}}]'
        workspace.module = 'Label Printing'
        workspace.parent_page = 'Printing'
        workspace.public = 1
        workspace.icon = 'barcode'
        if workspace.is_new():
            workspace.insert(ignore_permissions=True)
        else:
            workspace.save(ignore_permissions=True)
        frappe.db.commit()
    except Exception:
        frappe.log_error(frappe.get_traceback(), 'Label Printing: could not ensure nested workspace')
