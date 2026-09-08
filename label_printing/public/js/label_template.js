frappe.ui.form.on('Label Template', {
    refresh(frm) {
        if (frm.is_new()) return;
        frm.add_custom_button(__('Designer'), () => label_printing.open_designer(frm), __('Design'));
        frm.add_custom_button(__('Validate Layout'), () => label_printing.validate_layout(frm), __('Design'));
    }
});

label_printing.validate_layout = function(frm) {
    const w = flt(frm.doc.label_width_mm), h = flt(frm.doc.label_height_mm);
    const errors = [];
    (frm.doc.objects || []).forEach((o,i) => {
        if (flt(o.x) < 0 || flt(o.y) < 0) errors.push(__('Object {0}: X/Y cannot be negative.', [i+1]));
        if (flt(o.x)+flt(o.width) > w || flt(o.y)+flt(o.height) > h) errors.push(__('Object {0}: outside label bounds.', [i+1]));
        if (o.object_type === 'DataMatrix' && flt(o.width) < 8) errors.push(__('Object {0}: DataMatrix width is very small.', [i+1]));
        if (o.object_type !== 'Line' && !o.fieldname && !o.fixed_text && o.object_type !== 'Image') errors.push(__('Object {0}: map a field or enter fixed text.', [i+1]));
    });
    frappe.msgprint({title: errors.length ? __('Layout Warnings') : __('Layout Valid'), indicator: errors.length ? 'orange' : 'green', message: errors.length ? errors.join('<br>') : __('No obvious layout errors were found.')});
};

label_printing.open_designer = function(frm) {
    const d = new frappe.ui.Dialog({title:__('Label Designer'), size:'extra-large', fields:[{fieldname:'html',fieldtype:'HTML'}], primary_action_label:__('Save Layout'), primary_action(){ d.hide(); frm.save(); }});
    d.show();
    const wrap = d.fields_dict.html.$wrapper;
    const w = Math.max(160, Math.min(700, flt(frm.doc.label_width_mm)*3));
    const h = Math.max(100, Math.min(900, flt(frm.doc.label_height_mm)*3));
    wrap.html(`<div class="lp-designer"><div class="lp-toolbar"><button class="btn btn-sm btn-default lp-add" data-type="Text">+ Text</button> <button class="btn btn-sm btn-default lp-add" data-type="DataMatrix">+ DataMatrix</button> <button class="btn btn-sm btn-default lp-add" data-type="QR Code">+ QR</button> <button class="btn btn-sm btn-default lp-add" data-type="Line">+ Line</button> <button class="btn btn-sm btn-default lp-add" data-type="Rectangle">+ Rectangle</button></div><div class="lp-canvas" style="position:relative;width:${w}px;height:${h}px;border:1px solid #888;background:repeating-linear-gradient(0deg,transparent,transparent 14px,#eee 15px),repeating-linear-gradient(90deg,transparent,transparent 14px,#eee 15px);overflow:hidden"></div></div>`);
    const canvas = wrap.find('.lp-canvas');
    const scale = 3;
    function render(){
        canvas.empty();
        (frm.doc.objects||[]).forEach((o,i)=>{
            const el = $(`<div class="lp-object" data-i="${i}" style="position:absolute;border:1px dashed #666;left:${flt(o.x)*scale}px;top:${flt(o.y)*scale}px;width:${Math.max(8,flt(o.width||10)*scale)}px;height:${Math.max(8,flt(o.height||6)*scale)}px;overflow:hidden;background:rgba(255,255,255,.65)"></div>`);
            el.text(o.object_type==='Text' ? (o.fixed_text || '{{'+(o.fieldname||'field')+'}}') : o.object_type);
            el.on('dblclick',()=>{
                frappe.prompt([{fieldname:'fieldname',label:'Fieldname',fieldtype:'Data',default:o.fieldname||''},{fieldname:'fixed_text',label:'Fixed Text',fieldtype:'Data',default:o.fixed_text||''},{fieldname:'x',label:'X (mm)',fieldtype:'Float',default:o.x||0},{fieldname:'y',label:'Y (mm)',fieldtype:'Float',default:o.y||0},{fieldname:'width',label:'Width (mm)',fieldtype:'Float',default:o.width||10},{fieldname:'height',label:'Height (mm)',fieldtype:'Float',default:o.height||6},{fieldname:'font_size',label:'Font Size',fieldtype:'Int',default:o.font_size||20}],v=>{Object.assign(o,v); frm.dirty(); render();},__('Edit Object'));
            });
            canvas.append(el);
        });
    }
    wrap.on('click','.lp-add',e=>{const type=$(e.currentTarget).data('type');frm.add_child('objects',{object_type:type,x:2,y:2,width:type==='Text'?30:15,height:type==='Text'?6:15,fixed_text:type==='Text'?'New Label':''});frm.dirty();render();});
    render();
};
