const gui = (options, dropHandler) => {

    let fileDialogs = 0;
 
    const addMenuItem = (name, handler, parent = 'menulist', hint) => {
        const li = $('<li/>').html(name).addClass('menuitem').bind('click', e => {
            e.preventDefault();
            e.stopPropagation();
            if (handler) handler();
        });
        if (hint) li.attr('title', hint);
        li.appendTo(`#${parent}`);
        return li;
    }

    const addMenuFileOpen = (name, handler, parent = 'menulist', hint, accept) => {
        const inp = $(`<input type='file' id='fdialog${fileDialogs}' class='fileinput' onclick='this.value=null'>`);
        if (accept) {inp.attr('accept',accept)}
        const label = $('<label/>').attr('for', `fdialog${fileDialogs}`).html(name).addClass('menuitem');
        inp.change(handler);
        if (hint) label.attr('title', hint);
        $(`#${parent}`).append(inp, label);
        fileDialogs++;
        return label;
    }

    const addSeparator = (parent = 'menulist') => {
        $('<div/>').addClass('menuseparator').appendTo(`#${parent}`)
    }

    const addBR = (parent = 'menulist') => {
        $('<div/>').addClass('menubr').appendTo(`#${parent}`)
    }

    $('#save_options').click(saveOptions);
    $('#close_export').click(saveOptions);
    $('#close_help').click(toggleHelp);
    $('#opt_lastTemplate_i').change(templateChange);

    $("select, input").filter( (i,o) => { return _.endsWith($(o).attr('id'),'_b')} ).change(()=>{
        updateOptions();
    });

    for (let templateIdx in exportTemplates) {
        const template = exportTemplates[templateIdx];
        const option = $('<option/>').val(templateIdx).html(template.name);
        $('#opt_lastTemplate_i').append(option);
    };

    $('html').on("drop", function (event) {
        event.preventDefault();
        event.stopPropagation();
        if (event.originalEvent.dataTransfer.files) {
            // Use DataTransferItemList interface to access the file(s)
            for (var i = 0; i < event.originalEvent.dataTransfer.files.length; i++) {
                // If dropped items aren't files, reject them
                const file = event.originalEvent.dataTransfer.files[i];
                if (confirm(`Load new file ${file.name}?`)) {
                    dropHandler(file);
                }
            }
        }

    });

    return {
        addMenuItem,
        addMenuFileOpen,
        addSeparator,
        addBR
    }
};
