frappe.provide('label_printing.browser_print');

label_printing.browser_print = {
    _client: null,
    _printers: [],

    available() {
        return typeof BrowserPrint !== 'undefined';
    },

    init(callback) {
        if (!this.available()) {
            frappe.msgprint(__('Zebra Browser Print is not detected in this browser. Install/start Zebra Browser Print on this workstation.'));
            return;
        }
        BrowserPrint.getDefaultDevice('printer', device => {
            this._client = device;
            callback && callback(device);
        }, err => frappe.msgprint(__('Browser Print error: {0}', [String(err)])));
    },

    discover(callback) {
        if (!this.available()) return;
        BrowserPrint.getLocalDevices(devices => {
            this._printers = devices || [];
            callback && callback(this._printers);
        }, err => frappe.msgprint(__('Unable to discover Zebra printers: {0}', [String(err)])), 'printer');
    },

    print(zpl, device, callback) {
        const printer = device || this._client;
        if (!printer) {
            frappe.throw(__('No Zebra printer is selected.'));
        }
        printer.send(zpl, () => callback && callback(null), err => callback && callback(err));
    },

    sendToConfiguredPrinter(printer_name, zpl, callback) {
        this.discover(devices => {
            const device = devices.find(d => d.name === printer_name || d.uid === printer_name);
            if (!device) return callback && callback(new Error(__('Configured Zebra printer was not found on this workstation.')));
            this.print(zpl, device, callback);
        });
    }
};
