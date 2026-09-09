import frappe
from frappe import _


def _get_location_printer(branch=None, warehouse=None):
    if branch:
        name = frappe.db.get_value('Manage Printer', {'branch':branch,'enabled':1,'is_default_for_location':1}, 'name')
        if name: return name
    if warehouse:
        name = frappe.db.get_value('Manage Printer', {'warehouse':warehouse,'enabled':1,'is_default_for_location':1}, 'name')
        if name: return name
    return frappe.db.get_value('Manage Printer', {'enabled':1,'is_default_for_location':1}, 'name')


@frappe.whitelist()
def get_default_printer(branch=None, warehouse=None):
    user = frappe.session.user
    if branch:
        preferred = frappe.db.get_value('User Printer Preference', {'user':user,'branch':branch,'enabled':1}, 'default_printer')
        if preferred and frappe.db.get_value('Manage Printer', preferred, 'enabled'): return preferred
    if warehouse:
        preferred = frappe.db.get_value('User Printer Preference', {'user':user,'branch':warehouse,'enabled':1}, 'default_printer')
        if preferred and frappe.db.get_value('Manage Printer', preferred, 'enabled'): return preferred
    return _get_location_printer(branch, warehouse)


@frappe.whitelist()
def get_printer(printer):
    if not printer: frappe.throw(_('Printer is required'))
    return frappe.get_doc('Manage Printer', printer).as_dict()


@frappe.whitelist()
def get_doctype_fields(doctype=None, child_doctype=None):
    doctype = doctype or child_doctype
    if not doctype:
        return []
    meta = frappe.get_meta(doctype)
    return [{'value':f.fieldname,'fieldname':f.fieldname,'label':f.label or f.fieldname,'fieldtype':f.fieldtype} for f in meta.fields if f.fieldname and f.fieldtype not in {'Section Break','Column Break','Tab Break','HTML'}]


@frappe.whitelist()
def get_child_doctypes(parent_doctype):
    """Return only actual child-table DocTypes used by the selected parent DocType."""
    if not parent_doctype:
        return []
    meta = frappe.get_meta(parent_doctype)
    result = []
    seen = set()
    for field in meta.fields:
        if field.fieldtype == 'Table' and field.options and field.options not in seen:
            seen.add(field.options)
            child_meta = frappe.get_meta(field.options)
            if child_meta.istable:
                result.append({
                    'value': field.options,
                    'label': field.options,
                    'fieldname': field.fieldname,
                    'child_doctype': field.options,
                    'display': f'{field.label or field.fieldname} ({field.options})'
                })
    return result


@frappe.whitelist()
def get_child_doctype_info(doctype):
    """Return parent table mappings and fields for a child DocType."""
    if not doctype:
        return {'parents': [], 'fields': []}
    meta = frappe.get_meta(doctype)
    parents = []
    for parent_name in frappe.get_all('DocType', filters={'istable': 0}, pluck='name'):
        try:
            parent_meta = frappe.get_meta(parent_name)
            for field in parent_meta.fields:
                if field.fieldtype == 'Table' and field.options == doctype:
                    parents.append({'parent': parent_name, 'fieldname': field.fieldname, 'label': field.label or field.fieldname})
        except Exception:
            continue
    return {
        'parents': parents,
        'fields': [{'value':f.fieldname,'fieldname':f.fieldname,'label':f.label or f.fieldname,'fieldtype':f.fieldtype} for f in meta.fields if f.fieldname and f.fieldtype not in {'Section Break','Column Break','Tab Break','HTML'}]
    }
