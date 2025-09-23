//  #size#
//  #max#

const exportTemplates = [
    {
        name:'Column Data Export + 3 shifts right',
        shifts: 3,
				block: {
            prefix: '; Exports bytes in column format: #heightdec# bytes per column, #widthdec# columns, + all the data is additionally 3 times shifted right by a pixel (2 bits)\n; SPRITE DATA\n; frames, height, byteColumns\n; #frames#,#height#,#width#\n\n', postfix: ''
        },
        colors: {
            prefix: '; COLORS (background, color0, color1, color2)\n', postfix: ''
        },
        shift: {
            prefix: '\n; SHIFT #s#', postfix: ''
        },
        frame: {
            prefix: '; FRAME #f#\n', postfix: ''
        },
        column: {
            prefix: '', postfix: ''
        },
        line: {
            numbers: false,
            prefix: '\tdta ', postfix: '\t;COLUMN #col#\n'
        },
				line2: {
            numbers: false,
            prefix: '\tdta ', postfix: '\n'
        },
        byte: {
            separator: ', ',
            binPrefix: '%', hexPrefix: '$', addrPrefix: 'a(', addrPostfix: ')'
        }
     },     

    {
        name:'Column Data Export',
        block: {
            prefix: '; Exports bytes in column format: #heightdec# bytes per column, #widthdec# columns\n; SPRITE DATA\n; frames, height, byteColumns\n; #frames#,#height#,#width#\n\n', postfix: ''
        },
        colors: {
            prefix: '; COLORS (background, color0, color1, color2)\n', postfix: ''
        },
        shift: {
            prefix: '\n; SHIFT #s#\n', postfix: ''
        },
        frame: {
            prefix: '; FRAME #f#\n', postfix: ''
        },
        column: {
            prefix: '', postfix: ''
        },
        line: {
            numbers: false,
            prefix: '\tdta ', postfix: '\t;COLUMN #col#\n'
        },
				line2: {
            numbers: false,
            prefix: '\tdta ', postfix: '\n'
        },
        byte: {
            separator: ', ',
            binPrefix: '%', hexPrefix: '$', addrPrefix: 'a(', addrPostfix: ')'
        }
},     

//{"Width":"2","Height":"2","Chars":"75697665","Data":"0000666666663E000018003818183C0000006666663C180000003C667E603C00","FontNr":"11"}
//{"Width":"1","Height":"2","Chars":"0001","Data":"0028CA94001455665555557F1500000000000000"}
    {
        name:'Atari FontMaker Clipboard',
				fontmaker: 1,
        block: {
            prefix: '// Copy single frame (line) into clipboard and paste to the font area of Atari FontMaker in MegaCopy mode\n', postfix: ''
        },
    //    colors: {
    //        prefix: '// ignore colors:', postfix: '\n'
    //    },
        shift: {
            prefix: '', postfix: ''
        },
        frame: {
            prefix: '\n// FRAME #f#\n', postfix: ''
        },
        column: {
            prefix: '', postfix: ''
        },
        line: {
            numbers: false,
            prefix: '', postfix: '"}\n\n',
						poop: '{"Width":"#char_width#","Height":"#char_height#","Data":"'
        },
				line2: {
            numbers: false,
            prefix: '', postfix: ''
        },
        byte: {
            separator: '',
            binPrefix: '%', hexPrefix: '', addrPrefix: 'a(', addrPostfix: ')'
        }

     } ,

    {
        name:'Rows Data Export',
        block: {
            prefix: '; Exports bytes in rows format: #widthdec# bytes per row, #heightdec# rows\n; frames, height, width\n; #frames#,#height#,#width#\n\n', postfix: ''
        },
        colors: {
            prefix: '; COLORS (background, color0, color1, color2)\n', postfix: '\n'
        },
        frame: {
            prefix: '; FRAME #f#\n', postfix: '\n'
        },
        line: {
        numbers: false,
            prefix: '\tdta ', postfix: '\n'
        },
        line2: {
            numbers: false,
            prefix: '\tdta ', postfix: '\n'
        },
        byte: {
            separator: ', ',
            binPrefix: '%', hexPrefix: '$', addrPrefix: 'a(', addrPostfix: ')'
        }
    },

    {
        name:'Rows Chars Export',
        block: {
            prefix: '; Exports chars in rows format: 8 bytes per char, #widthdec# chars in a row, #heightdecdiv8# rows\n; frames, height, width\n; #frames#,#height#,#width#\n\n', postfix: ''
        },
        colors: {
            prefix: '; COLORS (background, color0, color1, color2)\n', postfix: '\n'
        },
        frame: {
            prefix: '; FRAME #f#\n', postfix: '\n'
        },
        line: {
            numbers: false,
            prefix: '\tdta ', postfix: '\n'
        },
        line2: {
            numbers: false,
            prefix: '\tdta ', postfix: '\n'
        },
        byte: {
            separator: ', ',
            binPrefix: '%', hexPrefix: '$', addrPrefix: 'a(', addrPostfix: ')'
        }
    }
]

