import json

import frappe


def after_install():
    for role in ['Label Printing User', 'Label Printing Manager', 'Label Printing Administrator']:
        if not frappe.db.exists('Role', role):
            frappe.get_doc({'doctype': 'Role', 'role_name': role, 'desk_access': 1}).insert(ignore_permissions=True)
    frappe.db.commit()


LABEL_PRINTING_SHORTCUTS = [
    {'label': 'Print Label', 'link_to': 'print-label', 'type': 'Page', 'color': 'Purple'},
    {'label': 'Label Templates', 'link_to': 'Label Template', 'type': 'DocType', 'doc_view': 'List', 'color': 'Blue'},
    {'label': 'Printers', 'link_to': 'Manage Printer', 'type': 'DocType', 'doc_view': 'List', 'color': 'Green'},
    {'label': 'Print Jobs', 'link_to': 'Label Print Job', 'type': 'DocType', 'doc_view': 'List', 'color': 'Orange'},
    {'label': 'Print Logs', 'link_to': 'Label Print Log', 'type': 'DocType', 'doc_view': 'List', 'color': 'Grey'},
]


def _ensure_shortcuts_and_content(workspace_name, shortcuts):
    """Add each shortcut to both the Shortcut child table (the data) and the
    content JSON (the layout that actually decides what's drawn in the
    workspace body) -- a shortcut row alone does not render without a
    matching block in content. Idempotent and defensive: never raises, so
    a schema surprise on some Frappe version logs an error instead of
    breaking bench migrate."""
    if not frappe.db.exists('Workspace', workspace_name):
        return
    try:
        workspace = frappe.get_doc('Workspace', workspace_name)
        existing_labels = {row.label for row in workspace.shortcuts}
        added = []
        for shortcut in shortcuts:
            if shortcut['label'] not in existing_labels:
                workspace.append('shortcuts', shortcut)
                added.append(shortcut['label'])
        if not added:
            return
        try:
            blocks = frappe.parse_json(workspace.content) if workspace.content else []
            if not isinstance(blocks, list):
                blocks = []
        except Exception:
            blocks = []
        already_blocked = {
            b.get('data', {}).get('shortcut_name')
            for b in blocks if isinstance(b, dict) and b.get('type') == 'shortcut'
        }
        for label in added:
            if label not in already_blocked:
                blocks.append({'id': frappe.generate_hash(length=10), 'type': 'shortcut', 'data': {'shortcut_name': label, 'col': 3}})
        workspace.content = json.dumps(blocks)
        workspace.save(ignore_permissions=True)
        frappe.db.commit()
    except Exception:
        frappe.log_error(frappe.get_traceback(), f'Label Printing: could not update {workspace_name} workspace shortcuts')


def ensure_label_printing_workspace():
    """A Label Printing workspace nested under Printing (parent_page =
    'Printing') so it never appears as a separate, top-level dashboard --
    nested pages show up inside their parent's sidebar tree, not the main
    app switcher -- while still existing as a real workspace with
    module = 'Label Printing'. That module match is what Frappe's
    breadcrumbs actually use to link a document back to a workspace
    (frappe.boot.module_wise_workspaces, grouped by each workspace's own
    module field); without a workspace carrying this module, Label
    Template / Manage Printer / etc. documents have no breadcrumb to link
    to at all. Runs on every migrate so this survives future updates."""
    try:
        if frappe.db.exists('Workspace', 'Label Printing'):
            workspace = frappe.get_doc('Workspace', 'Label Printing')
        else:
            workspace = frappe.new_doc('Workspace')
            workspace.name = 'Label Printing'
            workspace.title = 'Label Printing'
            workspace.label = 'Label Printing'
            workspace.content = json.dumps([
                {'id': frappe.generate_hash(length=10), 'type': 'header', 'data': {'text': '<span class="h4">Label Printing</span>', 'col': 12}},
            ])
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
        return
    _ensure_shortcuts_and_content('Label Printing', LABEL_PRINTING_SHORTCUTS)


def ensure_printing_workspace_shortcuts():
    """Keep the same Label Printing shortcuts visible directly in ERPNext's
    standard 'Printing' workspace too, so the module is reachable from
    there without an extra click into the nested page. label_printing's
    own code/doctypes stay fully separate from ERPNext core either way --
    only this workspace *data* is touched, and it's re-applied by this
    app's own code on every future migrate, not a manual edit that could
    be lost on an ERPNext update."""
    _ensure_shortcuts_and_content('Printing', LABEL_PRINTING_SHORTCUTS)
