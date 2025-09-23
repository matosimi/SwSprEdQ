const GRID_COLOR = 'rgba(200,200,200,0.3)';
const MAX_FILESIZE = 640 * 1024;
const swspqHeader = [0x53,0x77,0x53,0x70,0x71,0x21]; //SwSpq
const defaultOptions = {
    version: '1.0.0',
		releaseDate: '17.09.2025',
    storageName: 'SwSprEdStore084q',
    undoLevels: 128,
    lineResolution: 2,
    spriteHeight: 16,
    spriteWidth: 4,
    showGrid: 1,
    cellSize: 24,
    wrapEditor: 1,
    animationSpeed: 5,
    palette: 'PAL',
    commonPalette: 1,
    bytesExport: 'HEX',
    bytesPerLine: 16,
    lastTemplate: 0,
    startingLine: 10000,
    lineStep: 10,
    ORDrawsOutside: 0, 
    squarePixel: 1
}
let options = {};
const dontSave = ['version', 'storageName'];

let editor = null;
let player = 0;
let playerInterval = null;

let undos = [];
let redos = [];
let beforeDrawingState = null;

// Custom palette buffer: 128 entries, each 3 bytes RGB (384 bytes)
let customPalette = null;
const PALETTE_KEY = `${defaultOptions.storageName}_PALETTE`;

const bytesToBase64 = (bytes) => {
	let binary = '';
	for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
	return btoa(binary);
}

const base64ToBytes = (b64) => {
	const binary = atob(b64);
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i) & 0xFF;
	return bytes;
}

const defaultWorkspace = {
    selectedColor: 1,
    selectedFrame: 0,
    backgroundColor: 0,
    clipBoard: {},
    frames: []
}

let workspace = {};

const reversedBytes = [
    0x00, 0x80, 0x40, 0xC0, 0x20, 0xA0, 0x60, 0xE0, 0x10, 0x90, 0x50, 0xD0, 0x30, 0xB0, 0x70, 0xF0,
    0x08, 0x88, 0x48, 0xC8, 0x28, 0xA8, 0x68, 0xE8, 0x18, 0x98, 0x58, 0xD8, 0x38, 0xB8, 0x78, 0xF8,
    0x04, 0x84, 0x44, 0xC4, 0x24, 0xA4, 0x64, 0xE4, 0x14, 0x94, 0x54, 0xD4, 0x34, 0xB4, 0x74, 0xF4,
    0x0C, 0x8C, 0x4C, 0xCC, 0x2C, 0xAC, 0x6C, 0xEC, 0x1C, 0x9C, 0x5C, 0xDC, 0x3C, 0xBC, 0x7C, 0xFC,
    0x02, 0x82, 0x42, 0xC2, 0x22, 0xA2, 0x62, 0xE2, 0x12, 0x92, 0x52, 0xD2, 0x32, 0xB2, 0x72, 0xF2,
    0x0A, 0x8A, 0x4A, 0xCA, 0x2A, 0xAA, 0x6A, 0xEA, 0x1A, 0x9A, 0x5A, 0xDA, 0x3A, 0xBA, 0x7A, 0xFA,
    0x06, 0x86, 0x46, 0xC6, 0x26, 0xA6, 0x66, 0xE6, 0x16, 0x96, 0x56, 0xD6, 0x36, 0xB6, 0x76, 0xF6,
    0x0E, 0x8E, 0x4E, 0xCE, 0x2E, 0xAE, 0x6E, 0xEE, 0x1E, 0x9E, 0x5E, 0xDE, 0x3E, 0xBE, 0x7E, 0xFE,
    0x01, 0x81, 0x41, 0xC1, 0x21, 0xA1, 0x61, 0xE1, 0x11, 0x91, 0x51, 0xD1, 0x31, 0xB1, 0x71, 0xF1,
    0x09, 0x89, 0x49, 0xC9, 0x29, 0xA9, 0x69, 0xE9, 0x19, 0x99, 0x59, 0xD9, 0x39, 0xB9, 0x79, 0xF9,
    0x05, 0x85, 0x45, 0xC5, 0x25, 0xA5, 0x65, 0xE5, 0x15, 0x95, 0x55, 0xD5, 0x35, 0xB5, 0x75, 0xF5,
    0x0D, 0x8D, 0x4D, 0xCD, 0x2D, 0xAD, 0x6D, 0xED, 0x1D, 0x9D, 0x5D, 0xDD, 0x3D, 0xBD, 0x7D, 0xFD,
    0x03, 0x83, 0x43, 0xC3, 0x23, 0xA3, 0x63, 0xE3, 0x13, 0x93, 0x53, 0xD3, 0x33, 0xB3, 0x73, 0xF3,
    0x0B, 0x8B, 0x4B, 0xCB, 0x2B, 0xAB, 0x6B, 0xEB, 0x1B, 0x9B, 0x5B, 0xDB, 0x3B, 0xBB, 0x7B, 0xFB,
    0x07, 0x87, 0x47, 0xC7, 0x27, 0xA7, 0x67, 0xE7, 0x17, 0x97, 0x57, 0xD7, 0x37, 0xB7, 0x77, 0xF7,
    0x0F, 0x8F, 0x4F, 0xCF, 0x2F, 0xAF, 0x6F, 0xEF, 0x1F, 0x9F, 0x5F, 0xDF, 0x3F, 0xBF, 0x7F, 0xFF,
];

// ******************************* HELPERS

Number.prototype.clamp = function (min, max) {
    return Math.min(Math.max(this, min), max);
}

function decimalToHex(d, padding) {
    let hex = Number(d).toString(16);
    padding = typeof (padding) === "undefined" || padding === null ? padding = 2 : padding;
    while (hex.length < padding) {
        hex = "0" + hex;
    }
    return hex;
}

function decimalToBin(d, padding) {
    let bin = Number(d).toString(2);
    padding = typeof (padding) === "undefined" || padding === null ? padding = 8 : padding;
    bin = bin.substring(-8);
    while (bin.length < padding) {
        bin = "0" + bin;
    }
    return bin;
}


const userIntParse = (udata) => {
    if (_.isNull(udata)) return null;
    udata = _.trim(udata);
    let sign = 1;
    if (_.startsWith(udata, '-')) {
        sign = -1;
        udata = udata.slice(1);
    }
    if (_.startsWith(udata, '$')) {
        udata = parseInt(_.trim(udata, '$'), 16);
    } else {
        udata = parseInt(udata, 10);
    }
    if (!_.isNaN(udata)) {
        if (sign === -1) {
            udata = binFile.data.length - udata;
        }
        return udata;
    } else {
        return NaN;
    }
}

// **** empty frame filled by default values
const getEmptyFrame = () => {
    const frame = {
        data: [],
        colors: [0x1e, 0x16, 0x26, 0x14, 0x48]
    }
    // init the matrix
    for (let c = 0; c < options.spriteWidth; c++)
      frame.data[c] = [];
      
    // clear the values
    for (let r=0;r<options.spriteHeight;r++) {
      for (let c=0;c<options.spriteWidth;c++)
        frame.data[c][r] = 0;
    }
    return frame;
}

// *********************************** UNDO

const pushUndo = (name, undoData) => {
    while (undos.length >= options.undoLevels) {
        undos.shift();
    }
    undos.push({ name, data: undoData });
    _.remove(redos);
    storeUndos();
}

const saveUndo = (name, modifier) => {
    return () => {
        const undoData = _.cloneDeep(workspace);
        const result = modifier?modifier():true;
        if (result) {
            pushUndo(name, undoData);
        }
    }
}

const undo = () => {
    if (undos.length > 0) {
        const undo = undos.pop();
        const redo = { name: undo.name, data: _.cloneDeep(workspace) };
        redos.push(redo);
        workspace = _.cloneDeep(undo.data);
        storeWorkspace();
        storeUndos();
        updateScreen();
    }
}

const redo = () => {
    if (redos.length > 0) {
        const redo = redos.pop();
        const undo = { name: redo.name, data: _.cloneDeep(workspace) };
        undos.push(undo);
        workspace = _.cloneDeep(redo.data);
        storeWorkspace();
        storeUndos();
        updateScreen();
    }
}

// *********************************** COLOR OPERATIONS

const getColors = (frame) => {
    if (options.commonPalette) {
        frame = 0;
    }
    return [
        workspace.backgroundColor,
        workspace.frames[frame].colors[0],
        workspace.frames[frame].colors[1],
        workspace.frames[frame].colors[2],
				workspace.frames[frame].colors[3],
        workspace.frames[frame].colors[4]
    ];
}

const updateColors = colors => {
    if (colors==undefined) {
        colors = getColors(workspace.selectedFrame);
    }
    for (let i=0;i<6;i++) {
        $(`#color${i}`)
        .css('background-color',getByteRGB(colors[i]))
        .attr('title',`${colors[i]} ($${decimalToHex(colors[i]).toUpperCase()})`)
    }
    colorClicked(workspace.selectedColor);
}

const colorClicked = (c) => {
    if (player) { return false };
		if (c < 4) workspace.selectedColor = c;
		if (c == 4) workspace.selectedColor = 1;
		if (c == 5) workspace.selectedColor = 3;
    $('.colorbox').removeClass('colorSelected');
    $(`#color${workspace.selectedColor}`).addClass('colorSelected');
    storeWorkspace();
}

const getColorRGB = (frame,c) => {
    const colors = getColors(frame);
    return getByteRGB(colors[c]);
}

const getByteRGB = (cval) => {

	// If a custom palette is selected and loaded, prefer it over PAL/NTSC math
	if (options.palette === 'CUSTOM' && customPalette instanceof Uint8Array) {
		if (customPalette.length === 768) {
			const fileIndex = (cval | 1) & 0xFF; // ensure odd index within 0..255
			const base = fileIndex * 3;
			const r = customPalette[base + 0] | 0;
			const g = customPalette[base + 1] | 0;
			const b = customPalette[base + 2] | 0;
			return `rgb(${r},${g},${b})`;
		}
		if (customPalette.length === 384) {
			const idx = Math.max(0, Math.min(127, Math.round(cval / 2)));
			const base = idx * 3;
			const r = customPalette[base + 0] | 0;
			const g = customPalette[base + 1] | 0;
			const b = customPalette[base + 2] | 0;
			return `rgb(${r},${g},${b})`;
		}
	}

    const cr = (cval >> 4) & 15;
    const lm = cval & 15;
    const crlv = cr ? 50 : 0;

    const phase = (options.palette == 'PAL')?((cr - 1) * 25.7 - 15) * (2 * 3.14159 / 360): ((cr-1)*25 - 58) * (2 * 3.14159 / 360);

    const y = 255 * (lm + 1) / 16;
    const i = crlv * Math.cos(phase);
    const q = crlv * Math.sin(phase);

    const r = y + 0.956 * i + 0.621 * q;
    const g = y - 0.272 * i - 0.647 * q;
    const b = y - 1.107 * i + 1.704 * q;

    const rr = (Math.round(r)).clamp(0, 255);
    const gg = (Math.round(g)).clamp(0, 255);
    const bb = (Math.round(b)).clamp(0, 255);
    
    const rgb = `rgb(${rr},${gg},${bb})`;
    return rgb;
}

const getColorOn = (frame,col,row) => {
    const c0 = workspace.frames[frame].data[col][row];
    return c0;
}

const getRGBOn = (frame,col,row) => {
    return getColorRGB(frame,getColorOn(frame,col,row));
}

const setColorOn = (col,row,color) => {
        const currentFrame = workspace.frames[workspace.selectedFrame];
        if (!beforeDrawingState) {beforeDrawingState = _.cloneDeep(workspace)}
        currentFrame.data[col][row] = color;
				/*//q-colors
				qcolor = color;
				if (row % 2 == 1)
				{
					if (color == 1) qcolor = 4;
					if (color == 3) qcolor = 5;
				}*/
        drawBlock(col,row,getColorRGB(workspace.selectedFrame,getQColor(row,color)));
}

const getQColor = (row,color) => {
	//q-colors
	qcolor = color;
	if (row % 2 == 1)
	{
		if (color == 1) qcolor = 4;
		if (color == 3) qcolor = 5;
	}
	return qcolor;
}

const setNewColor = (c, cval) => {
    const frame = (options.commonPalette)?0:workspace.selectedFrame;
    switch (c) {
        case 0:
            workspace.backgroundColor = cval;
            break;
        case 1:
            workspace.frames[frame].colors[0] = cval;
            break;
        case 2:
            workspace.frames[frame].colors[1] = cval;
            break;
        case 3:
            workspace.frames[frame].colors[2] = cval;
            break;
				case 4:
            workspace.frames[frame].colors[3] = cval;
            break;
        case 5:
            workspace.frames[frame].colors[4] = cval;
            break;
    }
    storeWorkspace();
}

const colorCellClicked = e => {
    if (player) { return false };
    cval = Number(_.last(_.split(e.target.id,'_')));
    c = Number(_.last($(e.target).parent()[0].id));
    setNewColor(c,cval);
    updateScreen();
    $(".palette").remove();

}

const showPalette = c => {
    if ($(`#pal${c}`).length) {
        $(".palette").remove();
    } else {
        $(".palette").remove();
        const pal = $("<div/>")
        .attr('id',`pal${c}`)
        .addClass('palette');
        let cval = 0;
        const colors = getColors(workspace.selectedFrame);

        while (cval<256) {
            const rgb = getByteRGB(cval);
            const cellClass = (cval == colors[c])?'cellSelected':'';
            const cell = $("<div/>")
            .addClass('colorCell')
            .addClass(cellClass)
            .attr('id',`col_${cval}`)
            .attr('title',`${cval} ($${decimalToHex(cval).toUpperCase()})`)
            .css('background-color', rgb)
            .bind('mousedown',colorCellClicked)
            if (cval % 16 == 0) cell.addClass('palette_firstinrow');
    
            pal.append(cell);
            cval += 2;
        }
        $("#main").append(pal);

    }
}

const pickerClicked = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const c = Number(_.last(e.target.id));
    showPalette(c);
    //console.log(c);
}

// *********************************** EDITOR OPERATIONS

const editorWindow = {}
let currentCell = {}

const sameCell = (c,n) => {
    if (c.row == undefined) {
        return false;
    }
    if (c.row != n.row) {
        return false;
    }
    if (c.col != n.col) {
        return false;
    }
    return true;
}

const locateCell = (event) => {
    const cell = {};
    const x = event.offsetX; 
    const y = event.offsetY; 
    cell.row = Math.floor(y/editorWindow.cyoffset);
    cell.col = Math.floor(x/editorWindow.cxoffset);
    return cell;
}

const onCanvasMove = (event) => {
    if (player || $('.dialog:visible').length > 0) { return false };
    const newCell = locateCell(event);
    if (!sameCell(currentCell,newCell)) {
        if (event.buttons > 0) {
            clickOnCanvas(event);
        }
    }
}

const clickOnCanvas = (event) => {
    if (player || $('.dialog:visible').length > 0) { return false };
    let color = workspace.selectedColor;
		// Right mouse OR Shift+Left acts as background draw
    if (event.buttons === 2 || (event.buttons === 1 && event.shiftKey)) {
            color = 0;
    }
    currentCell = locateCell(event);
    setColorOn(currentCell.col,currentCell.row,color);
}

const clickRightOnCanvas = (event) => {
    if (player || $('.dialog:visible').length > 0) { return false };
    event.preventDefault();
    return false;
}

const drawingEnded = () => {
    pushUndo('drawing', beforeDrawingState);
    beforeDrawingState = null;
    drawEditor();
    storeWorkspace();
}

const onMouseOut = (e) => {
    if (player) { return false };
    if (e.buttons > 0) {
        drawingEnded();
    }
}

const getWidthMultiplier = () => options.squarePixel?1:1.2;


const newCanvas = () => {
    editorWindow.columns = options.spriteWidth;
    editorWindow.cwidth = getWidthMultiplier() * options.cellSize;
    editorWindow.cxoffset = editorWindow.cwidth + options.showGrid;
    editorWindow.cheight = Math.floor(options.cellSize / options.lineResolution);
    editorWindow.cyoffset = editorWindow.cheight + options.showGrid;
    editorWindow.swidth =  editorWindow.columns * editorWindow.cxoffset - options.showGrid;
    editorWindow.sheight = options.spriteHeight * editorWindow.cyoffset - options.showGrid;

    $('#editor_box').empty();
    const cnv = $('<canvas/>')
    .attr('id','editor_canvas')
    .attr('width',editorWindow.swidth)
    .attr('height',editorWindow.sheight)
    .contextmenu(clickRightOnCanvas)
    .bind('mousedown',clickOnCanvas)
    .bind('mousemove',onCanvasMove)
    .bind('mouseup',drawingEnded)
    .bind('mouseleave',onMouseOut)

    $('#editor_box').append(cnv);
    editor = cnv[0].getContext('2d');
    //editor.translate(0.5, 0.5);
    //editor.imageSmoothingEnabled = false;
}

const getFrameImage = (frame, scalex, scaley) => {
    const w = options.spriteWidth * scalex;
    const h = options.spriteHeight * scaley;
    const cnv = $('<canvas/>')
    .addClass('framepreview')
    .attr('width', w)
    .attr('height', h)
    const ctx = cnv[0].getContext('2d');
    const imageData = ctx.createImageData(w, h);
    for (let row=0;row<options.spriteHeight;row++) {
        for (let col=0;col<options.spriteWidth;col++) {
            //const crgb = getRGBOn(frame, col, row);
            qcolor = getQColor(row, getColorOn(frame,col,row));
						//ctx.fillStyle = crgb;
						ctx.fillStyle = getColorRGB(frame,qcolor);
            ctx.lineWidth = 2;
            ctx.fillRect(Math.ceil(col*scalex),row*scaley,Math.ceil(scalex),Math.ceil(scaley));
        }
    }
    return cnv
}

const clearSprites = () => {
    for (let col = 0; col < options.spriteWidth; col++)
    {
      sprite.data[col] = [];
      for (let i=0; i<options.spriteHeight; i++)
          sprite.data[col][i] = 0; 
    }
}

const drawBlock = (x,y,crgb) => {
    editor.fillStyle = crgb;
    editor.lineWidth = 0;
    editor.fillRect(x * editorWindow.cxoffset - options.showGrid, y * editorWindow.cyoffset - options.showGrid, editorWindow.cwidth, editorWindow.cheight);
}

const drawEditor = () => {
    editor.clearRect(0,0,editorWindow.swidth,editorWindow.sheight);
    for (let row=0;row<options.spriteHeight;row++) {
        for (let col=0;col<editorWindow.columns;col++) {
            //drawBlock(col, row, getRGBOn(workspace.selectedFrame, col, row));
						drawBlock(col, row, getColorRGB(workspace.selectedFrame, getQColor(row,getColorOn(workspace.selectedFrame, col, row))));
        }
    }
    if(options.showGrid>0) {
        drawGrid();
    }
    $("#framepreview").empty();
    $("#framepreview").append(getFrameImage(workspace.selectedFrame,3,3/options.lineResolution));
    $("#framepreview").append(getFrameImage(workspace.selectedFrame,6,6/options.lineResolution));
    $("#framepreview").append(getFrameImage(workspace.selectedFrame,12,12/options.lineResolution));
    $(`#fbox_${workspace.selectedFrame}`).children().last().remove();
    $(`#fbox_${workspace.selectedFrame}`).append(getFrameImage(workspace.selectedFrame,4,4/options.lineResolution));
}

const drawTimeline = () => {
    $('#framelist').empty();
    if (workspace.selectedFrame >= workspace.frames) {
        workspace.selectedFrame = workspace.frames-1;
    }
    _.each(workspace.frames, (frame,f) => {
        const cnv = getFrameImage(f,4,4/options.lineResolution)
        const framebox = $("<div/>")
        .addClass('framebox')
        .attr('id',`fbox_${f}`)
        .append(`<div>$${decimalToHex(f)}</div>`)
        .bind('mousedown',frameboxClicked)
        .append(cnv)

        if (f==workspace.selectedFrame) {
            framebox.addClass('currentFrame');
        }

        $('#framelist').append(framebox);
        //console.log(f,frame);
    });
}

const updateScreen = () => {
    drawTimeline();
    drawEditor();
    updateColors();
}

const frameboxClicked = e => {
    if (player) { return false };
    const f = Number(_.last(_.split(e.target.id,'_')));
    //console.log(e.target);
    jumpToFrame(f);
}

const drawGridLine = (x1,y1,x2,y2) => {
    editor.beginPath();
    editor.moveTo(x1, y1);
    editor.lineTo(x2, y2);
    editor.lineWidth = options.showGrid;
    editor.strokeStyle = GRID_COLOR;
    editor.stroke();
};

const drawGrid = () => {
    for (let row=1;row<options.spriteHeight;row++) {
        const y = (editorWindow.cyoffset * row) - options.showGrid;
        drawGridLine(0,y,editorWindow.swidth,y);
    }
    for (let col=1;col<editorWindow.columns;col++) {
        const x = (editorWindow.cxoffset * col) - options.showGrid;
        drawGridLine(x,0,x,editorWindow.sheight);
    }
}

// ***************************************************** DIALOGS

const closeAllDialogs = () => {
    $('div.dialog:visible').slideUp();
}

const templateChange = () => {
    updateOptions();
    exportData();
}

const toggleDiv = (divId) => {
    closeAllDialogs();
    const isVisible = $(divId).is(':visible');
    if (isVisible) {
        $(divId).slideUp();
    } else {
        $(divId).slideDown();
    }
    return !isVisible;
}

const toggleExport = () => {
    if (toggleDiv('#export_dialog')) {
        refreshOptions();
        exportData();
    }
}

const toggleImportFrame = () => {
    if (toggleDiv('#import_dialog')) {
        $('#import_text').val(''); // Clear textarea when opening
        refreshOptions();
    }
};

const toggleHelp = () => {
    toggleDiv('#help_dialog')
}

const toggleOptions = () => {
    if (toggleDiv('#options_dialog')) {
        refreshOptions();
    }
}

// *********************************** OPTIONS

const valIntInput = (inputId) => {
    const idiv = $(`#opt_${inputId}_i`);
    const uint = userIntParse(idiv.val());
    if (_.isNaN(uint)) {
        idiv.addClass('warn').focus();
        return false;
    };
    idiv.val(uint);
    return true;
}

const clampOption = (inputId,min,max) => {
    const idiv = $(`#opt_${inputId}_i`);
    const uint = userIntParse(idiv.val());
    idiv.val(uint.clamp(min,max));
}

const refreshOptions = () => {
    const opts = _.filter($("select, input"), opt => {
        return _.startsWith($(opt).attr('id'),'opt_');
    });
    const newopts = {};
    _.each(opts, opt => {
        const opt_id = $(opt).attr('id');
        const opt_name = _.split(opt_id ,'_');
        const opt_type = opt_name[2];
        const opt_val = options[opt_name[1]];
        $(`#${opt_id}`).val(opt_val);
        if (opt_type == 'b') {
            $(`#${opt_id}`).prop('checked', opt_val);
        }
    });
}

const validateOptions = () => {
    $('.dialog_text_input').removeClass('warn');
    if (!valIntInput('bytesPerLine')) return false;
    if (!valIntInput('spriteHeight')) return false;
    if (!valIntInput('spriteWidth')) return false;
    if (!valIntInput('animationSpeed')) return false;
    if (!valIntInput('lineStep')) return false;
    if (!valIntInput('startingLine')) return false;

    clampOption('bytesPerLine',1,100000);
    clampOption('spriteHeight',1,128);
    clampOption('spriteWidth',4,32);
    clampOption('animationSpeed',1,100);
    
    return true;
}

const storeOptions = () => {
    localStorage.setItem(defaultOptions.storageName, JSON.stringify(_.omit(options, dontSave)));
}

const loadOptions = () => {
    if (!localStorage.getItem(defaultOptions.storageName)) {
        options = _.assignIn({}, defaultOptions);
        storeOptions();
    } else {
        options = _.assignIn({}, defaultOptions, JSON.parse(localStorage.getItem(defaultOptions.storageName)));
    }
}

const updateOptions = () => {
    const opts = _.filter($("select, input"), opt => {
        return _.startsWith($(opt).attr('id'),'opt_');
    });
    const newopts = {};
    _.each(opts, opt => {
        const opt_id = $(opt).attr('id');
        const opt_name = _.split(opt_id ,'_');
        let opt_value =  $(`#${opt_id}`).val();
        const opt_type = opt_name[2];
        if (opt_type == 'i') {
            newopts[opt_name[1]] = Number(opt_value);
        };
        if (opt_type == 's') {
            newopts[opt_name[1]] = `${opt_value}`;
        };
        if (opt_type == 'b') {
            newopts[opt_name[1]] = $(`#${opt_id}`).prop('checked');
        };        
    })
    _.assignIn(options, newopts);
    storeOptions();
    validateFrames();
}

const saveOptions = () => {
    if (validateOptions()) {
        updateOptions();
        closeAllDialogs();
    }
    newCanvas();
    if (player) {
        stopPlayer();
        startPlayer();
    }
    updateScreen();
}

// ************************************ WORKSPACE STORAGE

const storeWorkspace = () => {
     localStorage.setItem(`${defaultOptions.storageName}_WS`, JSON.stringify(workspace));
}

const storeUndos = () => {
    localStorage.setItem(`${defaultOptions.storageName}_UNDO`, JSON.stringify(undos));
    localStorage.setItem(`${defaultOptions.storageName}_REDO`, JSON.stringify(redos));
}

const loadUndos = () => {
    undos = [];
    redos = [];
    if (!localStorage.getItem(`${defaultOptions.storageName}_UNDO`)) {
        storeUndos();
    } else {
        try {
            undos = JSON.parse(localStorage.getItem(`${defaultOptions.storageName}_UNDO`));
            redos = JSON.parse(localStorage.getItem(`${defaultOptions.storageName}_REDO`));
        } catch (e) {
            console.log(e);
        }
    }
}

const loadWorkspace = () => {
     if (!localStorage.getItem(`${defaultOptions.storageName}_WS`)) {
         workspace = _.assignIn({}, _.clone(defaultWorkspace));
         workspace.frames.push(getEmptyFrame());
         storeWorkspace();
     } else {
         workspace = _.assignIn({}, _.clone(defaultWorkspace), JSON.parse(localStorage.getItem(`${defaultOptions.storageName}_WS`)));
     }
}

// *********************************** EXPORT / LOAD / SAVE

const exportData = () => {
    const template = exportTemplates[$('#opt_lastTemplate_i').val()];
    const body = parseTemplate(template);
    $('#export_frame').html(body);
}

const parseTemplate = (template) => {
   
    let templateLines = '';
    let byteInRow = 0;
    let lineCount = 0;
    let lineBody = '';
    let tframe = 0;
    let tshift = 0;
    let tcolumn = 0;
	let lastColumn = 0;
    let lines = '';

    const formatByte = b => {
        let optFormat = options.bytesExport;
        if (template.byte.forceNumeric=='DEC') {
            optFormat = 'DEC';
        }
        if (template.byte.forceNumeric=='HEX') {
            optFormat = 'HEX';
        }
        if (template.byte.forceNumeric=='BIN') {
            optFormat = 'BIN';
        }
        if (optFormat == 'HEX') {
            return `${template.byte.hexPrefix?template.byte.hexPrefix:''}${decimalToHex(userIntParse(b))}`;
        } 
        if (optFormat == 'BIN') {
            return `${template.byte.binPrefix?template.byte.binPrefix:''}${decimalToBin(userIntParse(b))}`;
        } 
        return b;
    }

    const parseTemplateVars = (template) => {
        return template
        .replace(/#height#/g, formatByte(options.spriteHeight))
        .replace(/#width#/g, formatByte(options.spriteWidth >>> 2))
        .replace(/#heightdec#/g, options.spriteHeight)
        .replace(/#heightdecdiv8#/g, Math.ceil(options.spriteHeight/8))
        .replace(/#widthdec#/g, options.spriteWidth >>> 2)
        .replace(/#frames#/g, formatByte(workspace.frames.length))
        .replace(/#maxheight#/g, formatByte(options.spriteHeight-1))
        .replace(/#maxframes#/g, formatByte(workspace.frames.length-1))
        .replace(/#-1#/g, options.startingLine-1)
        .replace(/#-2#/g, options.startingLine-2)

            
    }

    const getBlock = (block, blockTemp) => {
        let blockLines = `${blockTemp.prefix}${block}${blockTemp.postfix}`;
        blockLines = blockLines.replace(/#f#/g, tframe).replace(/#s#/g, tshift).replace(/#col#/g, tcolumn);
        //lineCount+= blockLines.split(/\r\n|\r|\n/).length + 1;
        return blockLines
    }

    const pushBlock = (block, blockTemp) => {
        templateLines += getBlock(block, blockTemp);
    }    
    
    const pushLine = (line, last) => {
        const num = (template.line.numbers) ? `${options.startingLine + options.lineStep * lineCount} `:'';
        lineCount++;
        if (tcolumn == lastColumn)
        {
            lines += `${num}${template.line2.prefix}${line}${last?template.line2.lastpostfix || template.line2.postfix:template.line2.postfix}`;
        }
        else
        {
            lines += `${num}${template.line.prefix}${line}${last?template.line.lastpostfix || template.line.postfix:template.line.postfix}`;
            lastColumn = tcolumn;
        }
        byteInRow = 0;
        lineBody = '';
    }

    const stepByte = (last) => {
        byteInRow++;
        if (byteInRow == options.bytesPerLine || last) {
            if (template.line.preserveLastSeparator) {
                lineBody += template.byte.separator 
            }
            byteInRow = 0;
            pushLine(lineBody, last);
            lineBody = '';
        } else lineBody += template.byte.separator;
    }

    const pushByte = (b, last) => {
        lineBody += formatByte(b);
        stepByte(last);
    }

    const pushSpriteColors = () => {
        lines = '';
        pushByte(workspace.backgroundColor);
        pushArray(workspace.frames[0].colors);
        pushBlock(lines, template.colors);
        lines = '';
    }

    const pushArray = a => {
        _.each(a,(v,i) => {pushByte(v & 0xFF, i==a.length-1)});
        if (byteInRow > 0) {
            pushLine(lineBody, true);
        }
    }

    const combinePixelsToBytes = (col0,col1,col2,col3) => {
      var output = [];
      for (let i = 0; i < col0.length; i++)
        output[i] = 64*col0[i] + 16*col1[i] + 4*col2[i] + col3[i];
      return output;
    }
        
    const pushSpriteData = () => {
        let shifts = template.shifts;
        lastColumn = -1;
        if (shifts == undefined) shifts = 0;
        for (let i = 0; i <= shifts; i++) {
            tshift = i;
            if (template.shifts != undefined) 
                pushBlock("", template.shift);
            _.each(workspace.frames, (frame,f) => {
                tframe = f;
                let sprite = '';
                if (template?.fontmaker == 1) {
                    pushBlock('', template.frame);
                    let numberFonts = Math.ceil(options.spriteHeight / 32);
                    let charWidth = options.spriteWidth / 4;
                    let charHeigth = Math.floor(options.spriteHeight / 8);
                    for (let font = 0; font < numberFonts; font++)
                    {
                        
                        let linesInThisFont = (charHeigth - font*4) >= 4 ? 4 : charHeigth - font*4;
                        //console.log(linesInThisFont);
                        template.line.prefix = template.line.poop
                                      .replace("#char_height#", linesInThisFont)
                                      .replace("#char_width#", charWidth)
                          
                        //console.log(template.line.prefix);

                        for (let charY = 0; charY < linesInThisFont; charY++)
                            for (let charX = 0; charX < charWidth; charX++)
                                for (let charLine = 0; charLine < 8; charLine++)
                                 {
                                 	sprite += formatByte(frame.data[charX*4][font*32 + charY*8+charLine]*64+
                                                                 frame.data[charX*4+1][font*32 + charY*8+charLine]*16+
                                                                 frame.data[charX*4+2][font*32 + charY*8+charLine]*4+
                                                                 frame.data[charX*4+3][font*32 + charY*8+charLine]);
                                 }
                        pushBlock(sprite, template.line);
                        sprite = '';
                    }
                    
                    
                } else if (template.name === 'Rows Data Export') {
                    // Export in row-by-row format (4 pixels per byte)
                    tline = 0;
                    for (let row = 0; row < options.spriteHeight; row++) {
                        let lineBytes = [];
                        for (let byteCol = 0; byteCol < Math.ceil(options.spriteWidth / 4); byteCol++) {
                            const col0 = frame.data[byteCol * 4]?.[row] || 0;
                            const col1 = frame.data[byteCol * 4 + 1]?.[row] || 0;
                            const col2 = frame.data[byteCol * 4 + 2]?.[row] || 0;
                            const col3 = frame.data[byteCol * 4 + 3]?.[row] || 0;
                            const byte = col0 * 64 + col1 * 16 + col2 * 4 + col3;
                            pushByte(byte, row == options.spriteHeight - 1 && byteCol == Math.ceil(options.spriteWidth / 4) - 1);
                        }
                    }
                    pushBlock(lines, template.frame);
                    lines = '';
                    tline = 0;
                } else if (template.name === 'Rows Chars Export') {
                    // Export in character chunks (8 bytes per character)
                    const charsPerRow = Math.floor(options.spriteWidth / 4);
                    const charsPerCol = Math.ceil(options.spriteHeight / 8);
                    const totalChars = charsPerRow * charsPerCol;
                    const totalBytes = totalChars * 8;
                    
                    for (let charY = 0; charY < charsPerCol; charY++) {
                        tcharline = charY;
                        for (let charX = 0; charX < charsPerRow; charX++) {
                            for (let scanline = 0; scanline < 8; scanline++) {
                                const row = charY * 8 + scanline;
                                let byte = 0;
                                
                                if (row < options.spriteHeight) {
                                    const col0 = frame.data[charX * 4]?.[row] || 0;
                                    const col1 = frame.data[charX * 4 + 1]?.[row] || 0;
                                    const col2 = frame.data[charX * 4 + 2]?.[row] || 0;
                                    const col3 = frame.data[charX * 4 + 3]?.[row] || 0;
                                    byte = col0 * 64 + col1 * 16 + col2 * 4 + col3;
                                }
                                
                                pushByte(byte, row === options.spriteHeight - 1 && charX === charsPerRow - 1 && scanline === 7);
                            }
                        }
                    }
                    pushBlock(lines, template.frame);
                    lines = '';
                } else {
                    // Original column-based export
                    const bytesPerRow = Math.ceil(options.spriteWidth / 4);
                    for (let byteCol = 0; byteCol < bytesPerRow; byteCol++) {
                        lines = '';
                        tcolumn = byteCol;
                        let ai = byteCol*4 - i;
                        
                        // Get columns with bounds checking
                        const getColumn = (index) => {
                            if (index < 0) return frame.data[options.spriteWidth - 1];
                            if (index >= options.spriteWidth) return frame.data[0];
                            return frame.data[index];
                        };

                        const col0 = getColumn(ai);
                        const col1 = getColumn(ai + 1);
                        const col2 = getColumn(ai + 2);
                        const col3 = getColumn(ai + 3);

                        // Ensure we only process the exact number of rows needed
                        const combinedBytes = combinePixelsToBytes(col0, col1, col2, col3);
                        for (let row = 0; row < options.spriteHeight; row++) {
                            pushByte(combinedBytes[row], row === options.spriteHeight - 1);
                        }
                        sprite += getBlock(lines, template.column);
                    }
                    pushBlock(sprite, template.frame);
                }
            });
        }   
    }
		if (template?.colors)	//do not push colors if template does not have them
			{
                tline = 1; //set line to 1 to avoid line 0
                tcharLine = 1;
                pushSpriteColors();
            }
			
    pushSpriteData();

    return parseTemplateVars(`${template.block.prefix}${templateLines}${template.block.postfix}`);
}

const saveFile = () => {
    const name = prompt('set filename of saved file:', 'mysprites.swspq');
    let binList = [];
    let listByte = 0;
    binList.push(swspqHeader);
    binList.push(workspace.selectedFrame,workspace.selectedColor,workspace.backgroundColor);
    binList.push(options.animationSpeed,options.palette=='PAL'?0:1,options.lineResolution);
    binList.push([0,0,0,0,0,0]); // 6 unused bytes
    binList.push(workspace.frames.length,options.spriteHeight,options.spriteWidth);
    binList.push(workspace.frames[0].colors);
    
    for (let col = 0; col < options.spriteWidth; col++)
      _.each(workspace.frames,f=>{f.data[col].length=options.spriteHeight;binList.push(f.data[col])});
    
    binList = _.flatMap(binList);
    var a = document.createElement('a');
    document.body.appendChild(a);
    var file = new Blob([new Uint8Array(binList)]);
    a.href = URL.createObjectURL(file);
    if (name) {
        a.download = name;
        a.click();
        setTimeout(() => { $(a).remove(); }, 100);
    }
};

const openFile = function (event) {
    var input = event.target;
    var file = input.files[0];
    dropFile(file)
};

// Load custom 128xRGB palette (384 bytes)
const openPaletteFile = function (event) {
	var input = event.target;
	var file = input.files[0];
	loadCustomPalette(file);
};

const loadCustomPalette = (file) => {
	if (!file) { return; }
	const reader = new FileReader();
	reader.onload = () => {
		try {
			const bytes = new Uint8Array(reader.result);
			if (bytes.length !== 384 && bytes.length !== 768) {
				alert('Palette file must be 384 bytes (128xRGB) or 768 bytes (256xRGB).');
				return;
			}
			customPalette = bytes;
			try { localStorage.setItem(PALETTE_KEY, bytesToBase64(bytes)); } catch(e) { console.log(e); }
			updateScreen();
		} catch (e) {
			console.log(e);
			alert('Failed to load palette file.');
		}
	};
	reader.readAsArrayBuffer(file);
};

const clearCustomPalette = () => {
	customPalette = null;
	try { localStorage.removeItem(PALETTE_KEY); } catch(e) { console.log(e); }
	updateScreen();
};

const loadPaletteFromStorage = () => {
	try {
		const b64 = localStorage.getItem(PALETTE_KEY);
		if (!b64) return;
		const bytes = base64ToBytes(b64);
		if (bytes && (bytes.length === 384 || bytes.length === 768)) {
			customPalette = bytes;
		}
	} catch(e) {
		console.log(e);
	}
}

const parseBinary = (binData) => {

    const parseError = msg => { alert(msg); }

    const areEqual = (a1,a2) => {
        if (a1.length != a2.length) {
            return false;
        }
        for (let i=0;i<a1.length;i++) {
            if (a1[i] != a2[i]) {
                return false;
            }
        }
        return true;
    }

    const binSize = binData.length;
    let binPtr = 0;
    let id = 0;    
       
    if (areEqual(swspqHeader,binData.subarray(0,6))) {            // PARSE SWSPQ 

        const wrkspc = _.clone(defaultWorkspace);
        wrkspc.frames = [];
        binPtr = 6;
        wrkspc.selectedFrame = binData[binPtr++];
        wrkspc.selectedColor = binData[binPtr++];
        wrkspc.backgroundColor = binData[binPtr++];
        options.animationSpeed = binData[binPtr++];
        options.palette = (binData[binPtr++]==1)?'NTSC':'PAL';
        options.lineResolution = binData[binPtr++];
        binPtr += 6; // unused bytes
        const aplFrames = binData[binPtr++];
        options.spriteHeight = binData[binPtr++];
        options.spriteWidth = binData[binPtr++];

        const colors = Array.from(binData.subarray(binPtr,binPtr+=5));
               
        for(let f=0;f<aplFrames;f++) {
            const frame = {
                data: [],
                colors: colors
            }

            for (let col = 0;col < options.spriteWidth; col++)
              frame.data[col] = [];
            wrkspc.frames.push(frame);
        }
        //for(let f=0;f<aplFrames;f++) {
        //    wrkspc.frames[f].colors.push(binData[binPtr++]);
        //}
        for (let col = 0; col < options.spriteWidth; col++)
        {
          for(let f=0;f<aplFrames;f++) {
              wrkspc.frames[f].data[col] = Array.from(binData.subarray(binPtr,binPtr+options.spriteHeight));
              binPtr += options.spriteHeight;
          }
        }
        wrkspc.frames.length = aplFrames;
        return wrkspc;

    } else {
        parseError('unknown format!')
        return false;
    }
}

const dropFile = function (file) {
    if (file) {
        var reader = new FileReader();
        reader.onload = function () {
            var arrayBuffer = reader.result;
            if (file.size > MAX_FILESIZE) {
                alert(`ERROR!!!\n\nFile size limit exceeded. Size: ${file.size} B - limit: ${MAX_FILESIZE} kB`);
                return false;
            }
            const binFileName = file.name;
            const binFileData = new Uint8Array(arrayBuffer);
            newWorkspace = parseBinary(binFileData);
            if (newWorkspace) {
                newCanvas();
                workspace = newWorkspace;
                refreshOptions();
                updateOptions();
                updateScreen();
                undos = [];
                redos = [];
                storeUndos();
            }
            file.name = '';
        };
        reader.readAsArrayBuffer(file);
    }
}

// import
const importFrame = () => {
    const textData = $('#import_text').val();
    if (!textData) {
        alert("Please enter frame data to import");
        return false;
    }

    const parsedData = parseImportedFrameData(textData);
    if (parsedData) {
        saveUndo('import frame', () => {
            workspace.frames[workspace.selectedFrame].data = parsedData;
            if (!workspace.frames[workspace.selectedFrame].colors) {
                workspace.frames[workspace.selectedFrame].colors = [0x28, 0xca, 0x94];
            }
            storeWorkspace();
            const stored = JSON.parse(localStorage.getItem(`${defaultOptions.storageName}_WS`));
            if (!stored || !stored.frames[workspace.selectedFrame] || 
                JSON.stringify(stored.frames[workspace.selectedFrame].data) !== JSON.stringify(parsedData)) {
                console.error("Failed to store frame data correctly");
                return false;
            }
            updateScreen();
            toggleImportFrame();
            return true;
        })();
    }
    return true;
};

const handleFileInput = (file) => {
    if (file.size > 4096) { // 4KB
        if (!confirm('File is larger than 4KB. Do you want to proceed?')) {
            return;
        }
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        const arrayBuffer = e.target.result;
        const bytes = new Uint8Array(arrayBuffer);
        let hexString = '';
        for (let i = 0; i < bytes.length; i++) {
            hexString += bytes[i].toString(16).padStart(2, '0');
        }
        $('#import_text').val(hexString);
    };
    reader.readAsArrayBuffer(file);
};

const parseImportedFrameData = (textData) => {
    try {
        textData = textData.trim();
        let frameData = [];
        let width = options.spriteWidth;
        let height = options.spriteHeight;
        const importMode = $('#import_mode').val();

        // Check if input is a continuous hex string (no separators)
        if (/^[0-9a-fA-F]+$/.test(textData)) {
            const bytes = [];
            for (let i = 0; i < textData.length; i += 2) {
                const byte = parseInt(textData.substr(i, 2), 16);
                if (!isNaN(byte)) {
                    bytes.push(byte);
                }
            }
            textData = bytes.join(', ');
        }

        if (importMode === 'fontmaker') {
            // Parse as JSON character chunks
            try {
                const jsonData = JSON.parse(textData);
                if (jsonData.Data && typeof jsonData.Data === 'string') {
                    const hexData = jsonData.Data.replace(/\s/g, '');
                    width = parseInt(jsonData.Width) * 4 || width;
                    height = parseInt(jsonData.Height) * 8 || height;

                    if (width !== options.spriteWidth || height !== options.spriteHeight) {
                        alert(`Size of data (${width}x${height}) does not match sprite size (${options.spriteWidth}x${options.spriteHeight})!`);
                        return null;
                    }

                    const bytes = [];
                    for (let i = 0; i < hexData.length; i += 2) {
                        const byte = parseInt(hexData.substr(i, 2), 16);
                        if (!isNaN(byte)) {
                            bytes.push(byte);
                        }
                    }

                    const charsPerRow = width / 4;
                    const charsPerCol = height / 8;
                    frameData = Array.from({ length: width }, () => Array(height).fill(0));

                    let byteIndex = 0;
                    for (let charY = 0; charY < charsPerCol; charY++) {
                        for (let charX = 0; charX < charsPerRow; charX++) {
                            for (let scanline = 0; scanline < 8; scanline++) {
                                if (byteIndex >= bytes.length) break;
                                const byte = bytes[byteIndex++];
                                const row = charY * 8 + scanline;
                                if (row >= height) continue;

                                const pixels = [
                                    (byte >> 6) & 0x3,
                                    (byte >> 4) & 0x3,
                                    (byte >> 2) & 0x3,
                                    byte & 0x3
                                ];

                                for (let px = 0; px < 4; px++) {
                                    const col = charX * 4 + px;
                                    if (col < width) {
                                        frameData[col][row] = pixels[px];
                                    }
                                }
                            }
                        }
                    }
                }
            } catch (jsonError) {
                alert('Invalid JSON format for fontmaker mode');
                return null;
            }
        } else {
            // Parse as text lines for other modes
            const lines = textData.split('\n').map(line => {
                // Remove block comments first
                line = line.replace(/\/\*[\s\S]*?\*\//g, '');
                // Remove line comments
                line = line.replace(/;.*$/, '').replace(/\/\/.*$/, '');
                return line.trim();
            }).filter(line => line.length > 0);
            let byteData = [];

            lines.forEach(line => {
                if (line) {
                    const values = line.split(/[\s,]+/)
                        .map(val => {
                            if (val.startsWith('$')) {
                                return parseInt(val.slice(1), 16);
                            } else if (val.startsWith('0x')) {
                                return parseInt(val.slice(2), 16);
                            } else if (val.startsWith('%')) {
                                return parseInt(val.slice(1), 2);
                            }
                            return parseInt(val, 10);
                        })
                        .filter(val => !isNaN(val) && val >= 0 && val <= 255);
                    
                    if (values.length > 0) {
                        byteData.push(...values);
                    }
                }
            });

            frameData = Array.from({ length: width }, () => Array(height).fill(0));

            if (importMode === 'columns') {
                // Parse as columns (4 pixels per byte)
                const bytesPerColumn = Math.ceil(height / 4);
                const totalColumns = width;
                const expectedBytes = bytesPerColumn * totalColumns;

                if (byteData.length < expectedBytes) {
                    alert(`Insufficient data: ${byteData.length} bytes provided, need at least ${expectedBytes} for ${width}x${height} sprite!`);
                    return null;
                }

                let byteIndex = 0;
                // Process columns in groups of 4
                for (let colGroup = 0; colGroup < width; colGroup += 4) {
                    // For each row in the current group of columns
                    for (let row = 0; row < height; row++) {
                        if (byteIndex >= byteData.length) break;
                        const byte = byteData[byteIndex++];
                        
                        // Split byte into 4 pixels and place in current columns
                        const pixels = [
                            (byte >> 6) & 0x3,
                            (byte >> 4) & 0x3,
                            (byte >> 2) & 0x3,
                            byte & 0x3
                        ];

                        // Place pixels in the current group of columns
                        for (let px = 0; px < 4; px++) {
                            const col = colGroup + px;
                            if (col < width) {
                                frameData[col][row] = pixels[px];
                            }
                        }
                    }
                }
            } else if (importMode === 'rowsData') {
                // Parse as rows (4 pixels per byte)
                const bytesPerRow = Math.ceil(width / 4);
                const totalRows = height;
                const expectedBytes = bytesPerRow * totalRows;

                if (byteData.length < expectedBytes) {
                    alert(`Insufficient data: ${byteData.length} bytes provided, need at least ${expectedBytes} for ${width}x${height} sprite!`);
                    return null;
                }

                let byteIndex = 0;
                for (let row = 0; row < height; row++) {
                    for (let byteCol = 0; byteCol < bytesPerRow; byteCol++) {
                        if (byteIndex >= byteData.length) break;
                        const byte = byteData[byteIndex++];

                        const pixels = [
                            (byte >> 6) & 0x3,
                            (byte >> 4) & 0x3,
                            (byte >> 2) & 0x3,
                            byte & 0x3
                        ];

                        for (let px = 0; px < 4; px++) {
                            const col = byteCol * 4 + px;
                            if (col < width) {
                                frameData[col][row] = pixels[px];
                            }
                        }
                    }
                }
            } else if (importMode === 'rowsChars') {
                // Parse as character chunks (8 bytes per character)
                const charsPerRow = Math.floor(width / 4);
                const charsPerCol = Math.ceil(height / 8);
                const expectedBytes = charsPerRow * charsPerCol * 8;

                if (byteData.length < expectedBytes) {
                    alert(`Insufficient data: ${byteData.length} bytes provided, need at least ${expectedBytes} for ${charsPerRow}x${charsPerCol} chars!`);
                    return null;
                }

                let byteIndex = 0;
                for (let charY = 0; charY < charsPerCol; charY++) {
                    for (let charX = 0; charX < charsPerRow; charX++) {
                        for (let scanline = 0; scanline < 8; scanline++) {
                            if (byteIndex >= byteData.length) break;
                            const byte = byteData[byteIndex++];
                            const row = charY * 8 + scanline;
                            if (row >= height) continue;

                            const pixels = [
                                (byte >> 6) & 0x3,
                                (byte >> 4) & 0x3,
                                (byte >> 2) & 0x3,
                                byte & 0x3
                            ];

                            for (let px = 0; px < 4; px++) {
                                const col = charX * 4 + px;
                                if (col < width) {
                                    frameData[col][row] = pixels[px];
                                }
                            }
                        }
                    }
                }
            }
        }

        if (frameData.length === 0) {
            throw new Error("No valid data found in input");
        }

        // Normalize frameData to match sprite dimensions
        const normalizedData = [];
        for (let col = 0; col < options.spriteWidth; col++) {
            normalizedData[col] = [];
            for (let row = 0; row < options.spriteHeight; row++) {
                normalizedData[col][row] = frameData[col] && frameData[col][row] !== undefined 
                    ? frameData[col][row] 
                    : 0;
            }
        }

        return normalizedData;
    } catch (error) {
        alert(`Error parsing frame data: ${error.message}`);
        return null;
    }
};

// ************************************ TIMELINE OPERATIONS

const jumpToFrame = f => {
    if (workspace.frames[f]) {
        workspace.selectedFrame = f;
        updateScreen();
    }
}

const jumpToNextFrame = () => {
    workspace.selectedFrame++;
    if (workspace.selectedFrame >= workspace.frames.length) {
        workspace.selectedFrame = 0;    
    }
    updateScreen();
}

const jumpToPrevFrame = () => {
    workspace.selectedFrame--;
    if (workspace.selectedFrame < 0) {
        workspace.selectedFrame = workspace.frames.length - 1;    
    }
    updateScreen();
}

const deleteAll = () => {
    if (player) { return false };
    if (confirm('Do you really want to delete and erase all frames?  NO UNDO!')) {
        workspace.frames.length = 1;
        workspace.selectedFrame = 0;
        clearFrame();
        storeWorkspace();
        _.remove(undos);
        _.remove(redos);
        storeUndos();
        updateScreen();
    }
    return true;
}

const clearFrame = () => {
    if (player) { return false };
    for (let col = 0; col < options.spriteWidth; col++)
    for (let row = 0; row < options.spriteHeight; row++) 
        workspace.frames[workspace.selectedFrame].data[col][row] = 0;
    
    drawEditor();
    storeWorkspace();
    return true;
}

const startPlayer = () => {
    if ((player == 0) && !playerInterval && (workspace.frames.length>1)) {
        player = 1;
        playerInterval = setInterval(jumpToNextFrame,options.animationSpeed*20);
        $("#timeline li").first().addClass('red');
    }
}

const stopPlayer = () => {
    player = 0;
    clearInterval(playerInterval);
    $("#timeline li").first().removeClass('red');
    playerInterval = null;
}

const cloneFrame = () => {
    if (player) { return false };    
    const newframe = _.cloneDeep(workspace.frames[workspace.selectedFrame]);
    workspace.frames.splice(workspace.selectedFrame,0,newframe);
    jumpToFrame(workspace.selectedFrame+1);
    storeWorkspace();    
    return true;
}

const animFrameLeft = () => {
    if (player) { return false };    
    if (workspace.selectedFrame == 0) {return false}
    const newframe = _.cloneDeep(workspace.frames[workspace.selectedFrame]);
    workspace.frames.splice(workspace.selectedFrame,1);
    workspace.frames.splice(workspace.selectedFrame-1,0,newframe);
    jumpToFrame(workspace.selectedFrame-1);
    storeWorkspace();    
}

const animFrameRight = () => {
    if (player) { return false };    
    if (workspace.selectedFrame == workspace.frames.length-1) {return false}
    const newframe = _.cloneDeep(workspace.frames[workspace.selectedFrame]);
    workspace.frames.splice(workspace.selectedFrame,1);
    workspace.frames.splice(workspace.selectedFrame+1,0,newframe);
    jumpToFrame(workspace.selectedFrame+1);
    storeWorkspace();
}

const addFrame = () => {
    if (player) { return false };    
    const newframe = getEmptyFrame();
    workspace.frames.splice(workspace.selectedFrame+1,0,newframe);
    jumpToFrame(workspace.selectedFrame+1);
    storeWorkspace();
    return true;
}

const delFrame = () => {
    if (player) { return false };    
    if (workspace.frames.length>1) {
        workspace.frames.splice(workspace.selectedFrame,1);
        if (!workspace.frames[workspace.selectedFrame]) {
            workspace.selectedFrame--;
        }
        jumpToFrame(workspace.selectedFrame);
    }
    storeWorkspace();
    return true;
}

// ************************************ FRAME OPERATION

//perform frame content defaulting (on sprite size extension)
const validateFrames = () => {
    _.each(workspace.frames, (frame,f) => {
    //do autoextend of columns when accessed
    for (let col = 0; col < options.spriteWidth; col++)
    {
      if (frame.data[col] == undefined)
        frame.data[col] = [];
      for (let row = 0; row < options.spriteHeight; row++)
        frame.data[col][row] ??= 0;
    }
    });
}

const copyColors = () => {
    if (player || options.commonPalette) { return false };
    workspace.clipBoard.colors = _.cloneDeep(workspace.frames[workspace.selectedFrame].colors);
}

const pasteColors = () => {
    if (player || options.commonPalette) { return false };
    if (workspace.clipBoard.colors) {
        workspace.frames[workspace.selectedFrame].colors = _.cloneDeep(workspace.clipBoard.colors);
    }
    drawEditor();
    storeWorkspace();
    return true;
}

const copyFrame = () => {
    if (player) { return false };
    workspace.clipBoard.frame = _.cloneDeep(workspace.frames[workspace.selectedFrame]);
}

const pasteFrame = () => {
    if (player) { return false };
    if (workspace.clipBoard.frame) {
        workspace.frames[workspace.selectedFrame] = _.cloneDeep(workspace.clipBoard.frame);
    }
    drawEditor();
    storeWorkspace();
    return true;
}

const flip8Bits = b => reversedBytes[b];

const flipHFrame = () => {
    if (player) { return false };

    for (let row = 0; row < options.spriteHeight; row++)
      for (let col = 0; col < options.spriteWidth / 2; col++)
        [ workspace.frames[workspace.selectedFrame].data[col][row], workspace.frames[workspace.selectedFrame].data[options.spriteWidth-col-1][row]] = [ workspace.frames[workspace.selectedFrame].data[options.spriteWidth-col-1][row], workspace.frames[workspace.selectedFrame].data[col][row]]; 

    drawEditor();
    storeWorkspace();
    return true;
}

const flipVFrame = () => {
    if (player) { return false };
    
    for (let row = 0; row < Math.floor(options.spriteHeight / 2); row++)
      for (let col = 0; col < options.spriteWidth; col++)
        [ workspace.frames[workspace.selectedFrame].data[col][row], workspace.frames[workspace.selectedFrame].data[col][options.spriteHeight - row - 1]] = [ workspace.frames[workspace.selectedFrame].data[col][options.spriteHeight - row - 1], workspace.frames[workspace.selectedFrame].data[col][row]];

    drawEditor();
    storeWorkspace();
    return true;
}

const inverseFrame = () => {
    if (player) { return false };
    
    for (let row = 0; row < options.spriteHeight; row++)
      for (let col = 0; col < options.spriteWidth; col++)
        workspace.frames[workspace.selectedFrame].data[col][row] ^= 0x3;
				
    drawEditor();
    storeWorkspace();
    return true;
}


const moveFrameLeft = () => {
    if (player) { return false };
    
    for (let row = 0; row < options.spriteHeight; row++)
      {
      for (let col = 0; col < options.spriteWidth - 1; col++)
        workspace.frames[workspace.selectedFrame].data[col][row] = workspace.frames[workspace.selectedFrame].data[col + 1][row];
      workspace.frames[workspace.selectedFrame].data[options.spriteWidth - 1][row] = 0;  //clear last column 
      }
    drawEditor();
    storeWorkspace();
    return true;
}

const moveFrameRight = () => {
    if (player) { return false };
    
    for (let row = 0; row < options.spriteHeight; row++)
      {
      for (let col = options.spriteWidth - 1; col > 0; col--)
        workspace.frames[workspace.selectedFrame].data[col][row] = workspace.frames[workspace.selectedFrame].data[col - 1][row];
      workspace.frames[workspace.selectedFrame].data[0][row] = 0;  //clear first column 
      }
    
    drawEditor();
    storeWorkspace();
    return true;
}

const moveFrameUp = () => {
    if (player) { return false };
   
    for (let col = 0; col < options.spriteWidth; col++)
    {
      for (let row = 0; row < options.spriteHeight - 1; row++)
        workspace.frames[workspace.selectedFrame].data[col][row] = workspace.frames[workspace.selectedFrame].data[col][row + 1];
      workspace.frames[workspace.selectedFrame].data[col][options.spriteHeight - 1] = 0;  //clear last row 
    }
   
    drawEditor();
    storeWorkspace();
    return true;
}

const moveFrameDown = () => {
    if (player) { return false };
    
    for (let col = 0; col < options.spriteWidth; col++)
    {
      for (let row = options.spriteHeight - 1; row > 0; row--)  
        workspace.frames[workspace.selectedFrame].data[col][row] = workspace.frames[workspace.selectedFrame].data[col][row - 1];
      workspace.frames[workspace.selectedFrame].data[col][0] = 0;  //clear first row 
    }
    
    drawEditor();
    storeWorkspace();
    return true;
}

/*
const heightDown = () => {
    if (player) { return false };
    const s0 = workspace.frames[workspace.selectedFrame].data[0]
    const s1 = workspace.frames[workspace.selectedFrame].data[1]
    workspace.frames[workspace.selectedFrame].data[0] = _.filter(s0,(v,k)=>(k%2==0));
    workspace.frames[workspace.selectedFrame].data[1] = _.filter(s1,(v,k)=>(k%2==0));
    drawEditor();
    storeWorkspace();
    return true;
}

const heightUp = () => {
    if (player) { return false };
    const s0 = workspace.frames[workspace.selectedFrame].data[0]
    const s1 = workspace.frames[workspace.selectedFrame].data[1]
    workspace.frames[workspace.selectedFrame].data[0] = _.flatMap(s0,v=>[v,v]);
    workspace.frames[workspace.selectedFrame].data[1] = _.flatMap(s1,v=>[v,v]);
    drawEditor();
    storeWorkspace();
    return true;
}
*/

// ************************************ KEY BINDINGS

const keyPressed = e => {               // always working
    switch (e.code) {
        case 'KeyE':
            if (e.ctrlKey) {
                e.preventDefault();
                toggleExport();
            };
        break;    
    }
    if ($('.dialog:visible').length==0) { // editor only
        switch (e.code) {
            case 'Digit1':
                    colorClicked(1);
                break;
            case 'Digit2':
                    colorClicked(2);
            break;
            case 'Digit3':
                    colorClicked(3);
            break;
            case 'Digit4':
            case 'Digit0':
            case 'Backquote':
                    colorClicked(0);
            break;
            case 'Space':
                if (player) {
                    stopPlayer();
                } else {
                    startPlayer();
                }
            break;
            case 'ArrowRight': 
                if (!player) {
                    jumpToNextFrame();
                }
            break;
            case 'ArrowLeft': 
                if (!player) {
                    jumpToPrevFrame();
                }
            break;
            case 'Home':
                workspace.selectedFrame = 0;
                updateScreen()
                break;        
            case 'End':
                workspace.selectedFrame = workspace.frames.length-1;
                updateScreen();
                break;        
/*            case 'BracketLeft':
                copyColors();
            break;              
            case 'BracketRight':
                if (saveUndo('paste colors', pasteColors)()) {
                    updateScreen();
                };
            break;   */           
            case 'Delete':
                if (saveUndo('delete frame', delFrame)()) {
                    updateScreen();
                };
            break;    
            case 'Insert':
                if (saveUndo('add frame', addFrame)()) {
                    updateScreen();
                };
            break;                
            case 'KeyZ':
                if (e.ctrlKey) {
                    undo()
                };
            break;         
            case 'KeyY':
                if (e.ctrlKey) {
                    redo()
                };
            break;         
            case 'KeyS':
                if (e.ctrlKey) {
                    e.preventDefault();
                    saveFile();
                };
            break;         
            case 'KeyO':
                if (e.ctrlKey) {
                    e.preventDefault();
                    $("#fdialog0").trigger('click');
                };
            break;        
   
            case 'KeyC':
                if (e.ctrlKey) {
                    copyFrame();
                }
            break;                             
            case 'KeyV':
                if (e.ctrlKey) {
                    saveUndo('paste frame', pasteFrame)();
                }
            break;                             
            default:
                break;
        }
   
    } else {  /// dialogs
        switch (e.code) {
            case 'Escape':
                closeAllDialogs();
            break;
            case 'Enter':
                if ($('#options_dialog').is(':visible')) {
                    saveOptions();
                }
            break;

            default:
                break;
        }
        }
    //console.log(e.code);
}


// ************************************************  ON START INIT 

$(document).ready(function () {

    loadOptions();
    const app = gui(options, dropFile);
    refreshOptions();
    $('title').append(` v.${options.version}q`);
    
    app.addMenuFileOpen('Load', openFile, 'appmenu', 'Loads Display List binary file', '.swspq');
    // Removed Load/Clear Palette from main menu; moved to Options dialog
    app.addMenuItem('Save', saveFile, 'appmenu', 'Saves Display List as a binary file');
    app.addMenuItem('Export', toggleExport, 'appmenu', 'Exports Display List to various formats');
    app.addSeparator('appmenu');
    app.addMenuItem('Undo', undo, 'appmenu', 'Undo');
    app.addMenuItem('Redo', redo, 'appmenu', 'Redo');
    app.addSeparator('appmenu');
    app.addMenuItem('Options', toggleOptions, 'appmenu', 'Shows Options');
    app.addSeparator('appmenu');
    app.addMenuItem('Help', toggleHelp, 'appmenu', 'Shows Help');
    app.addSeparator('appmenu');
    const ver = $('<div/>').attr('id','ver').html(`SwSprEd v${options.version}q (${options.releaseDate}) by MatoSimi`);
    $('#appmenu').append(ver);


    app.addMenuItem('Clear', saveUndo('clear frame', clearFrame), 'framemenu', 'Clears current frame');
    app.addMenuItem('Copy', copyFrame, 'framemenu', 'Copies from current frame');
    app.addMenuItem('Paste', saveUndo('paste frame', pasteFrame), 'framemenu', 'Pastes into current frame');
    app.addSeparator('framemenu');
    app.addMenuItem('Flip-H', saveUndo('flip h', flipHFrame), 'framemenu', 'Flips frame horizontally');
    app.addMenuItem('Flip-V', saveUndo('flip v', flipVFrame), 'framemenu', 'Flips frame vertically');
		app.addMenuItem('Inverse', saveUndo('inverse', inverseFrame), 'framemenu', 'Inverses frame bytes (useful for masking)');
    app.addSeparator('framemenu');
    app.addMenuItem('&#129092;', saveUndo('move left', moveFrameLeft), 'framemenu', 'Moves frame contents left');
    app.addMenuItem('&#129094;', saveUndo('move right', moveFrameRight), 'framemenu', 'Moves frame contents right');
    app.addMenuItem('&#129093;', saveUndo('move up', moveFrameUp), 'framemenu', 'Moves frame contents up');
    app.addMenuItem('&#129095;', saveUndo('move down', moveFrameDown), 'framemenu', 'Moves frame contents down');
    app.addSeparator('framemenu');
    
    app.addMenuItem('&#9654;', startPlayer, 'timemenu', 'Starts Animation [Space]');
    app.addMenuItem('&#9209;', stopPlayer, 'timemenu', 'Stops Animation [Space]');
    app.addSeparator('timemenu');
    app.addMenuItem('Add', saveUndo('add frame', addFrame), 'timemenu', 'Adds new empty frame');
    app.addMenuItem('Clone', saveUndo('clone frame', cloneFrame), 'timemenu', 'Adds copy of frame');
    app.addMenuItem('Delete', saveUndo('delete frame', delFrame), 'timemenu', 'Deletes current frame');
    app.addSeparator('timemenu');
		app.addMenuItem('Import frame', saveUndo('import frame', toggleImportFrame), 'timemenu', 'Imports a frame');
		app.addSeparator('timemenu');
    app.addMenuItem('&#129092;&#128913;', animFrameLeft, 'timemenu', 'Moves current frame left');
    app.addMenuItem('&#128913;&#129094;', animFrameRight, 'timemenu', 'Moves current frame right');
    app.addSeparator('timemenu');
    app.addMenuItem('Delete All', deleteAll, 'timemenu', 'Clears and deletes all frames');

    $('.colorbox').bind('mousedown',(e)=> {
        colorClicked(Number(_.last(e.target.id)));
    })

    for (let c=0;c<6;c++) {
        const picker = $("<div/>");
        picker.attr('id',`picker${c}`)
        .addClass('picker')
        .bind('mousedown',pickerClicked);
        $(`#color${c}`).append(picker);
    }

    $("#main").bind('mousedown',()=>{$(".palette").remove()})
    document.addEventListener('keydown', keyPressed);
    $('html').on('dragover',e=>{e.preventDefault()});

		// Add click handler for import button
    $('#import_submit').on('click', importFrame);

    // Add file input and drag-drop handlers for import
    const importTextArea = $('#import_text');
    const fileInput = $('<input type="file" id="import_file" style="display: none">');
    
    // Add file input to the dialog
    $('#import_dialog').prepend(fileInput);

    // Handle browse_raw button click
    $('#browse_raw').on('click', () => fileInput.click());

    fileInput.on('change', (e) => {
        if (e.target.files.length > 0) {
            handleFileInput(e.target.files[0]);
        }
    });

    importTextArea.on('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
        importTextArea.addClass('dragover');
    });

    importTextArea.on('dragleave', (e) => {
        e.preventDefault();
        e.stopPropagation();
        importTextArea.removeClass('dragover');
    });

    importTextArea.on('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        importTextArea.removeClass('dragover');
        
        if (e.originalEvent.dataTransfer.files.length > 0) {
            handleFileInput(e.originalEvent.dataTransfer.files[0]);
        }
    });

    loadWorkspace();
    loadUndos();
    loadPaletteFromStorage();

    // Wire custom palette controls in options dialog
    $('#btn_load_palette').off('click').on('click', function(){
        $('#custom_palette_file').val('');
        $('#custom_palette_file').click();
    });
    $('#custom_palette_file').off('change').on('change', function(e){
        openPaletteFile(e);
    });
    $('#btn_clear_palette').off('click').on('click', function(){
        clearCustomPalette();
    });

    newCanvas();
    updateScreen();


});





