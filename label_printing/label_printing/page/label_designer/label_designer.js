frappe.pages['label-designer'].on_page_load = function(wrapper) {
    const page = frappe.ui.make_app_page({ parent: wrapper, title: __('Label Designer'), single_column: true });
    const root = $(wrapper).find('.layout-main-section');
    root.html(`
      <style>
        .lpd-shell{display:grid;grid-template-columns:220px minmax(420px,1fr) 300px;gap:10px;min-height:calc(100vh - 170px)}
        .lpd-panel{background:var(--card-bg);border:1px solid var(--border-color);border-radius:8px;overflow:hidden}
        .lpd-head{padding:10px 12px;border-bottom:1px solid var(--border-color);font-weight:600}
        .lpd-body{padding:10px}.lpd-tools{display:grid;grid-template-columns:1fr 1fr;gap:6px}
        .lpd-tool{font-size:12px;text-align:left}.lpd-canvas-wrap{height:100%;min-height:600px;overflow:auto;background:var(--subtle-fg);padding:28px;display:flex;align-items:flex-start;justify-content:center}
        .lpd-canvas{position:relative;background:#fff;box-shadow:0 2px 12px rgba(0,0,0,.18);background-image:linear-gradient(#e8e8e8 1px,transparent 1px),linear-gradient(90deg,#e8e8e8 1px,transparent 1px);background-size:10px 10px;flex:none}
        .lpd-obj{position:absolute;box-sizing:border-box;border:1px dashed #888;overflow:hidden;cursor:move;background:rgba(255,255,255,.72);display:flex;align-items:center;padding:2px;user-select:none}
        .lpd-obj.selected{border:2px solid var(--primary-color);box-shadow:0 0 0 1px var(--primary-color)}
        .lpd-obj img{max-width:100%;max-height:100%;object-fit:contain}.lpd-barcode{width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:9px;color:#333}
        .lpd-field{margin-bottom:8px}.lpd-field label{display:block;font-size:11px;color:var(--text-muted);margin-bottom:3px}.lpd-field input,.lpd-field select{width:100%;padding:6px 7px;border:1px solid var(--border-color);border-radius:5px;background:var(--control-bg)}
        .lpd-grid2{display:grid;grid-template-columns:1fr 1fr;gap:7px}.lpd-actions{display:flex;gap:6px;align-items:center;flex-wrap:wrap;margin-bottom:8px}.lpd-layer{padding:7px;border-bottom:1px solid var(--border-color);cursor:pointer;font-size:12px}.lpd-layer.selected{background:var(--control-bg);font-weight:600}
        .lpd-muted{font-size:11px;color:var(--text-muted)}.lpd-status{margin-left:auto;font-size:12px;color:var(--text-muted)}
        @media(max-width:1100px){.lpd-shell{grid-template-columns:190px 1fr}.lpd-properties{grid-column:1/-1;min-height:300px}}
      </style>
      <div class="lpd-actions">
        <select class="form-control input-sm lpd-template" style="width:280px"></select>
        <button class="btn btn-sm btn-primary lpd-save">${__('Save')}</button>
        <button class="btn btn-sm btn-default lpd-preview">${__('Preview')}</button>
        <button class="btn btn-sm btn-default lpd-grid-toggle">${__('Grid')}</button>
        <button class="btn btn-sm btn-default lpd-zoom-out">−</button><span class="lpd-zoom">100%</span><button class="btn btn-sm btn-default lpd-zoom-in">+</button>
        <span class="lpd-status"></span>
      </div>
      <div class="lpd-shell">
        <div class="lpd-panel"><div class="lpd-head">${__('Objects')}</div><div class="lpd-body"><div class="lpd-tools">
          <button class="btn btn-xs btn-default lpd-tool" data-type="Text">+ ${__('Text')}</button>
          <button class="btn btn-xs btn-default lpd-tool" data-type="Barcode">+ ${__('Barcode')}</button>
          <button class="btn btn-xs btn-default lpd-tool" data-type="QR Code">+ ${__('QR Code')}</button>
          <button class="btn btn-xs btn-default lpd-tool" data-type="DataMatrix">+ ${__('DataMatrix')}</button>
          <button class="btn btn-xs btn-default lpd-tool" data-type="PDF417">+ ${__('PDF417')}</button>
          <button class="btn btn-xs btn-default lpd-tool" data-type="Aztec">+ ${__('Aztec')}</button>
          <button class="btn btn-xs btn-default lpd-tool" data-type="Image">+ ${__('Image / Logo')}</button>
          <button class="btn btn-xs btn-default lpd-tool" data-type="Line">+ ${__('Line')}</button>
          <button class="btn btn-xs btn-default lpd-tool" data-type="Rectangle">+ ${__('Rectangle')}</button>
        </div><hr><div class="lpd-head" style="padding:0 0 8px;border:0">${__('Layers')}</div><div class="lpd-layers"></div></div></div>
        <div class="lpd-panel"><div class="lpd-head">${__('Canvas')}</div><div class="lpd-canvas-wrap"><div class="lpd-canvas"></div></div></div>
        <div class="lpd-panel lpd-properties"><div class="lpd-head">${__('Properties')}</div><div class="lpd-body lpd-props"></div></div>
      </div>`);

    let template_name = frappe.get_route()[1] || '';
    let doc = null, selected = -1, zoom = 1, grid = true, fields = [], drag = null;
    const $r = root, canvas = $r.find('.lpd-canvas');

    function esc(v){ return frappe.utils.escape_html(String(v == null ? '' : v)); }
    function call(method,args){ return new Promise((resolve,reject)=>frappe.call({method,args,callback:r=>resolve(r.message),error:reject})); }
    async function load(){
        if(!template_name){
            const rows=await call('frappe.client.get_list',{doctype:'Label Template',fields:['name','template_name'],filters:{status:['!=','Archived']},limit_page_length:100});
            $r.find('.lpd-template').html((rows||[]).map(x=>`<option value="${esc(x.name)}">${esc(x.template_name||x.name)}</option>`).join(''));
            if(rows&&rows.length){template_name=rows[0].name;$r.find('.lpd-template').val(template_name);}
        } else $r.find('.lpd-template').html(`<option value="${esc(template_name)}">${esc(template_name)}</option>`);
        if(!template_name){$r.find('.lpd-status').text(__('Create a Label Template first.'));return;}
        doc=await call('frappe.client.get',{doctype:'Label Template',name:template_name});
        if(!doc){return;}
        $r.find('.lpd-template').val(template_name);
        fields=await call('label_printing.api.get_doctype_fields',{doctype:doc.source_doctype,child_table:doc.source_child_table}) || [];
        render();
    }
    function mmScale(){return Math.max(.8,Math.min(5,900/Math.max(1,flt(doc.label_width_mm||100))))*zoom;}
    function objectLabel(o){
        if(o.object_type==='Image') return __('Image / Logo');
        if(o.object_type==='Barcode') return o.barcode_type || __('Barcode');
        return o.fixed_text || o.fieldname || o.object_type;
    }
    function visual(o,el,scale){
        el.empty();
        if(o.object_type==='Image' && o.image_url){el.html(`<img src="${esc(o.image_url)}">`);return;}
        if(['Barcode','QR Code','DataMatrix','PDF417','Aztec'].includes(o.object_type)){
            const type=o.object_type==='Barcode'?(o.barcode_type||'Code 128'):o.object_type;
            el.html(`<div class="lpd-barcode">${esc(type)}<br>${esc(o.fieldname||o.fixed_text||'VALUE')}</div>`);return;
        }
        if(o.object_type==='Line'){el.css('background','var(--text-color)');return;}
        if(o.object_type==='Rectangle'){el.css('background','transparent');return;}
        el.text(o.fixed_text || o.fieldname || __('Text'));
        el.css({'font-size':Math.max(7,flt(o.font_size||28)/3.78*scale)+'px','justify-content':(o.alignment||'Left').toLowerCase()});
    }
    function render(){
        if(!doc)return;
        const scale=mmScale(), w=Math.max(100,flt(doc.label_width_mm||100)*scale), h=Math.max(80,flt(doc.label_height_mm||50)*scale);
        canvas.css({width:w,height:h,'background-image':grid?'linear-gradient(#e8e8e8 1px,transparent 1px),linear-gradient(90deg,#e8e8e8 1px,transparent 1px)':'none'});
        canvas.empty();
        (doc.objects||[]).slice().sort((a,b)=>(flt(a.z_index)||0)-(flt(b.z_index)||0)).forEach(o=>{
            const i=doc.objects.indexOf(o), el=$(`<div class="lpd-obj ${i===selected?'selected':''}"></div>`);
            el.css({left:flt(o.x_mm)*scale,top:flt(o.y_mm)*scale,width:Math.max(8,flt(o.width_mm||20)*scale),height:Math.max(8,flt(o.height_mm||6)*scale),'transform':`rotate(${o.rotation||0}deg)`,'z-index':o.z_index||1});
            visual(o,el,scale);el.on('mousedown',e=>{if(e.which!==1)return;selected=i;drag={x:e.clientX,y:e.clientY,ox:flt(o.x_mm),oy:flt(o.y_mm)};render();});canvas.append(el);
        });
        renderLayers();renderProps();
    }
    function renderLayers(){
        const box=$r.find('.lpd-layers').empty();(doc.objects||[]).slice().reverse().forEach(o=>{const i=doc.objects.indexOf(o);box.append(`<div class="lpd-layer ${i===selected?'selected':''}" data-i="${i}">${i+1}. ${esc(objectLabel(o))}</div>`);});
    }
    function selectOptions(current){return `<option value="">-- ${__('Fixed Value')} --</option>`+fields.map(f=>`<option value="${esc(f.value)}" ${f.value===current?'selected':''}>${esc((f.group?f.group+' · ':'')+(f.label||f.value))}</option>`).join('');}
    function renderProps(){
        const box=$r.find('.lpd-props').empty(),o=doc.objects&&doc.objects[selected];
        if(!o){box.html(`<div class="lpd-muted">${__('Select an object or add a new object.')}</div>`);return;}
        const types=['Text','Barcode','QR Code','DataMatrix','PDF417','Aztec','Image','Line','Rectangle'];
        box.html(`<div class="lpd-field"><label>${__('Object Type')}</label><select data-p="object_type">${types.map(x=>`<option ${x===o.object_type?'selected':''}>${x}</option>`).join('')}</select></div>
          <div class="lpd-field"><label>${__('ERPNext Field')}</label><select data-p="fieldname">${selectOptions(o.fieldname)}</select></div>
          <div class="lpd-field"><label>${__('Fixed Value / Text')}</label><input data-p="fixed_text" value="${esc(o.fixed_text||'')}"></div>
          <div class="lpd-field" data-barcode><label>${__('Barcode Type')}</label><select data-p="barcode_type"><option>Code 128</option><option>Code 39</option><option>Code 93</option><option>EAN-8</option><option>EAN-13</option><option>UPC-A</option><option>UPC-E</option><option>ITF</option><option>Codabar</option><option>GS1-128</option><option>GS1 DataBar</option></select></div>
          <div class="lpd-field" data-image><label>${__('Image / Logo')}</label><div class="image-upload"></div></div>
          <div class="lpd-grid2"><div class="lpd-field"><label>X (mm)</label><input type="number" step="0.1" data-p="x_mm" value="${o.x_mm||0}"></div><div class="lpd-field"><label>Y (mm)</label><input type="number" step="0.1" data-p="y_mm" value="${o.y_mm||0}"></div><div class="lpd-field"><label>Width (mm)</label><input type="number" step="0.1" data-p="width_mm" value="${o.width_mm||20}"></div><div class="lpd-field"><label>Height (mm)</label><input type="number" step="0.1" data-p="height_mm" value="${o.height_mm||6}"></div><div class="lpd-field"><label>${__('Rotation')}</label><select data-p="rotation"><option>0</option><option>90</option><option>180</option><option>270</option></select></div><div class="lpd-field"><label>${__('Font Size')}</label><input type="number" data-p="font_size" value="${o.font_size||28}"></div><div class="lpd-field"><label>${__('Alignment')}</label><select data-p="alignment"><option>Left</option><option>Center</option><option>Right</option></select></div><div class="lpd-field"><label>${__('Layer')}</label><input type="number" data-p="z_index" value="${o.z_index||1}"></div></div>
          <button class="btn btn-xs btn-danger lpd-delete">${__('Delete Object')}</button>`);
        box.find('[data-p="barcode_type"]').val(o.barcode_type||'Code 128');box.find('[data-p="rotation"]').val(o.rotation||'0');box.find('[data-p="alignment"]').val(o.alignment||'Left');
        box.find('[data-barcode]').toggle(['Barcode'].includes(o.object_type));box.find('[data-image]').toggle(o.object_type==='Image');
        box.find('[data-p]').on('input change',function(){let p=$(this).data('p'),v=$(this).val();if(['x_mm','y_mm','width_mm','height_mm','font_size','z_index'].includes(p))v=flt(v);o[p]=v;render();});
        if(o.object_type==='Image'){
            const uploader=new frappe.ui.form.ControlAttach({df:{fieldtype:'Attach Image',fieldname:'image_url'},parent:box.find('.image-upload'),render_input:true});uploader.set_value(o.image_url||'');uploader.$input.on('change',()=>{o.image_url=uploader.get_value();render();});
        }
        box.find('.lpd-delete').on('click',()=>{doc.objects.splice(selected,1);selected=Math.min(selected,doc.objects.length-1);render();});
    }
    $r.on('click','.lpd-tool',function(){const type=$(this).data('type');doc.objects=doc.objects||[];doc.objects.push({object_type:type,fieldname:'',fixed_text:type==='Text'?'Text':'',barcode_type:'Code 128',x_mm:3,y_mm:3,width_mm:type==='Text'?35:25,height_mm:type==='Text'?7:18,font_size:28,alignment:'Left',rotation:'0',data_matrix_scale:5,z_index:doc.objects.length+1});selected=doc.objects.length-1;render();});
    $r.on('click','.lpd-layer',function(){selected=Number($(this).data('i'));render();});
    $(document).on('mousemove.labeldesigner',function(e){if(!drag||!doc||selected<0)return;const o=doc.objects[selected],s=mmScale();o.x_mm=Math.max(0,drag.ox+(e.clientX-drag.x)/s);o.y_mm=Math.max(0,drag.oy+(e.clientY-drag.y)/s);render();}).on('mouseup.labeldesigner',function(){drag=null;});
    $r.find('.lpd-save').on('click',async()=>{await call('frappe.client.save',{doc});frappe.show_alert({message:__('Label template saved'),indicator:'green'});});
    $r.find('.lpd-template').on('change',async function(){template_name=this.value;await load();});
    $r.find('.lpd-grid-toggle').on('click',()=>{grid=!grid;render();});
    $r.find('.lpd-zoom-in').on('click',()=>{zoom=Math.min(2,zoom+.1);$r.find('.lpd-zoom').text(Math.round(zoom*100)+'%');render();});
    $r.find('.lpd-zoom-out').on('click',()=>{zoom=Math.max(.5,zoom-.1);$r.find('.lpd-zoom').text(Math.round(zoom*100)+'%');render();});
    $r.find('.lpd-preview').on('click',()=>frappe.show_alert({message:__('Preview uses the saved template layout. Printer ZPL preview is available from the print job.'),indicator:'blue'}));
    load();
};
