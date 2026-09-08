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
def get_doctype_fields(doctype):
    meta = frappe.get_meta(doctype)
    return [{'fieldname':f.fieldname,'label':f.label,'fieldtype':f.fieldtype} for f in meta.fields if f.fieldname and f.fieldtype not in {'Section Break','Column Break','Tab Break','HTML'}]
