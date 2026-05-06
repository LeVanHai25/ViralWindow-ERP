// ============================================
// DOOR TEMPLATES - 20 Mẫu chuẩn hóa
// Data Model: DoorDesign với LayoutNode
// ============================================

const TEMPLATES = {
    // MẪU 1 - Cửa đi 1 cánh mở quay trái
    "D1_L": {
        id: "D1_L",
        name: "Cửa đi 1 cánh mở trái",
        type: "door_open",
        layout: {
            id: "ROOT",
            kind: "group",
            split: "vertical",
            children: [
                {
                    id: "K1",
                    kind: "panel",
                    widthRatio: 1,
                    heightRatio: 1,
                    open: "left",
                    role: "sash"
                }
            ]
        }
    },

    // MẪU 2 - Cửa đi 1 cánh mở quay phải
    "D1_R": {
        id: "D1_R",
        name: "Cửa đi 1 cánh mở phải",
        type: "door_open",
        layout: {
            id: "ROOT",
            kind: "group",
            split: "vertical",
            children: [
                {
                    id: "K1",
                    kind: "panel",
                    widthRatio: 1,
                    heightRatio: 1,
                    open: "right",
                    role: "sash"
                }
            ]
        }
    },

    // MẪU 3 - Cửa đi 2 cánh mở quay đối xứng
    "D2_OS": {
        id: "D2_OS",
        name: "Cửa đi 2 cánh mở đối xứng",
        type: "door_open",
        layout: {
            id: "ROOT",
            kind: "group",
            split: "vertical",
            children: [
                {
                    id: "K1",
                    kind: "panel",
                    widthRatio: 0.5,
                    heightRatio: 1,
                    open: "left",
                    role: "sash"
                },
                {
                    id: "K2",
                    kind: "panel",
                    widthRatio: 0.5,
                    heightRatio: 1,
                    open: "right",
                    role: "sash"
                }
            ]
        }
    },

    // MẪU 4 - Cửa đi 2 cánh lệch (1 lớn - 1 nhỏ)
    "D2_LR": {
        id: "D2_LR",
        name: "Cửa đi 2 cánh lệch",
        type: "door_open",
        layout: {
            id: "ROOT",
            kind: "group",
            split: "vertical",
            children: [
                {
                    id: "K1",
                    kind: "panel",
                    widthRatio: 0.65,
                    heightRatio: 1,
                    open: "left",
                    role: "sash"
                },
                {
                    id: "K2",
                    kind: "panel",
                    widthRatio: 0.35,
                    heightRatio: 1,
                    open: "right",
                    role: "sash"
                }
            ]
        }
    },

    // MẪU 5 - Cửa đi 4 cánh mở quay ngoài
    "D4_OUT": {
        id: "D4_OUT",
        name: "Cửa đi 4 cánh mở quay ngoài",
        type: "door_open",
        layout: {
            id: "ROOT",
            kind: "group",
            split: "vertical",
            children: [
                {
                    id: "K1",
                    kind: "panel",
                    widthRatio: 0.25,
                    heightRatio: 1,
                    open: "left",
                    role: "sash"
                },
                {
                    id: "K2",
                    kind: "panel",
                    widthRatio: 0.25,
                    heightRatio: 1,
                    open: "right",
                    role: "sash"
                },
                {
                    id: "K3",
                    kind: "panel",
                    widthRatio: 0.25,
                    heightRatio: 1,
                    open: "left",
                    role: "sash"
                },
                {
                    id: "K4",
                    kind: "panel",
                    widthRatio: 0.25,
                    heightRatio: 1,
                    open: "right",
                    role: "sash"
                }
            ]
        }
    },

    // MẪU 6 - Cửa đi 4 cánh mở trong
    "D4_IN": {
        id: "D4_IN",
        name: "Cửa đi 4 cánh mở quay trong",
        type: "door_open_in",
        layout: {
            id: "ROOT",
            kind: "group",
            split: "vertical",
            children: [
                {
                    id: "K1",
                    kind: "panel",
                    widthRatio: 0.25,
                    heightRatio: 1,
                    open: "left",
                    role: "sash"
                },
                {
                    id: "K2",
                    kind: "panel",
                    widthRatio: 0.25,
                    heightRatio: 1,
                    open: "right",
                    role: "sash"
                },
                {
                    id: "K3",
                    kind: "panel",
                    widthRatio: 0.25,
                    heightRatio: 1,
                    open: "left",
                    role: "sash"
                },
                {
                    id: "K4",
                    kind: "panel",
                    widthRatio: 0.25,
                    heightRatio: 1,
                    open: "right",
                    role: "sash"
                }
            ]
        }
    },

    // MẪU 7 - Cửa sổ mở hất
    "S1_HAT": {
        id: "S1_HAT",
        name: "Cửa sổ mở hất",
        type: "window_tilt",
        layout: {
            id: "ROOT",
            kind: "group",
            split: "vertical",
            children: [
                {
                    id: "K1",
                    kind: "panel",
                    widthRatio: 1,
                    heightRatio: 1,
                    open: "tilt",
                    role: "sash"
                }
            ]
        }
    },

    // MẪU 8 - Cửa sổ mở quay 1 cánh
    "S1_QUAY": {
        id: "S1_QUAY",
        name: "Cửa sổ mở quay 1 cánh",
        type: "window_open",
        layout: {
            id: "ROOT",
            kind: "group",
            split: "vertical",
            children: [
                {
                    id: "K1",
                    kind: "panel",
                    widthRatio: 1,
                    heightRatio: 1,
                    open: "left",
                    role: "sash"
                }
            ]
        }
    },

    // MẪU 9 - Cửa sổ mở quay 2 cánh
    "S2_QUAY": {
        id: "S2_QUAY",
        name: "Cửa sổ mở quay 2 cánh",
        type: "window_open",
        layout: {
            id: "ROOT",
            kind: "group",
            split: "vertical",
            children: [
                {
                    id: "K1",
                    kind: "panel",
                    widthRatio: 0.5,
                    heightRatio: 1,
                    open: "left",
                    role: "sash"
                },
                {
                    id: "K2",
                    kind: "panel",
                    widthRatio: 0.5,
                    heightRatio: 1,
                    open: "right",
                    role: "sash"
                }
            ]
        }
    },

    // MẪU 10 - Cửa sổ mở trượt 2 cánh
    "S2_SLIDE": {
        id: "S2_SLIDE",
        name: "Cửa sổ trượt 2 cánh",
        type: "window_slide",
        layout: {
            id: "ROOT",
            kind: "group",
            split: "vertical",
            children: [
                {
                    id: "K1",
                    kind: "panel",
                    widthRatio: 0.5,
                    heightRatio: 1,
                    open: "slide_left",
                    role: "sash"
                },
                {
                    id: "K2",
                    kind: "panel",
                    widthRatio: 0.5,
                    heightRatio: 1,
                    open: "slide_right",
                    role: "sash"
                }
            ]
        }
    },

    // MẪU 11 - Cửa sổ trượt 3 cánh
    "S3_SLIDE": {
        id: "S3_SLIDE",
        name: "Cửa sổ trượt 3 cánh",
        type: "window_slide",
        layout: {
            id: "ROOT",
            kind: "group",
            split: "vertical",
            children: [
                {
                    id: "K1",
                    kind: "panel",
                    widthRatio: 0.33,
                    heightRatio: 1,
                    open: "slide_left",
                    role: "sash"
                },
                {
                    id: "K2",
                    kind: "panel",
                    widthRatio: 0.34,
                    heightRatio: 1,
                    open: "slide_right",
                    role: "sash"
                },
                {
                    id: "K3",
                    kind: "panel",
                    widthRatio: 0.33,
                    heightRatio: 1,
                    open: "slide_left",
                    role: "sash"
                }
            ]
        }
    },

    // MẪU 12 - Cửa đi trượt 2 cánh
    "D2_SLIDE": {
        id: "D2_SLIDE",
        name: "Cửa đi trượt 2 cánh",
        type: "door_slide",
        layout: {
            id: "ROOT",
            kind: "group",
            split: "vertical",
            children: [
                {
                    id: "K1",
                    kind: "panel",
                    widthRatio: 0.5,
                    heightRatio: 1,
                    open: "slide_left",
                    role: "sash"
                },
                {
                    id: "K2",
                    kind: "panel",
                    widthRatio: 0.5,
                    heightRatio: 1,
                    open: "slide_right",
                    role: "sash"
                }
            ]
        }
    },

    // MẪU 13 - Cửa đi trượt 3 cánh
    "D3_SLIDE": {
        id: "D3_SLIDE",
        name: "Cửa đi trượt 3 cánh",
        type: "door_slide",
        layout: {
            id: "ROOT",
            kind: "group",
            split: "vertical",
            children: [
                {
                    id: "K1",
                    kind: "panel",
                    widthRatio: 0.33,
                    heightRatio: 1,
                    open: "slide_left",
                    role: "sash"
                },
                {
                    id: "K2",
                    kind: "panel",
                    widthRatio: 0.34,
                    heightRatio: 1,
                    open: "slide_right",
                    role: "sash"
                },
                {
                    id: "K3",
                    kind: "panel",
                    widthRatio: 0.33,
                    heightRatio: 1,
                    open: "slide_left",
                    role: "sash"
                }
            ]
        }
    },

    // MẪU 14 - Vách kính cố định 1 ô
    "V1": {
        id: "V1",
        name: "Vách cố định 1 ô",
        type: "fixed",
        layout: {
            id: "ROOT",
            kind: "group",
            split: "vertical",
            children: [
                {
                    id: "K1",
                    kind: "panel",
                    widthRatio: 1,
                    heightRatio: 1,
                    open: "fixed",
                    role: "fix"
                }
            ]
        }
    },

    // MẪU 15 - Vách kính chia 2 ô (đứng)
    "V2_VERTICAL": {
        id: "V2_VERTICAL",
        name: "Vách chia 2 ô đứng",
        type: "fixed",
        layout: {
            id: "ROOT",
            kind: "group",
            split: "vertical",
            children: [
                {
                    id: "K1",
                    kind: "panel",
                    widthRatio: 0.5,
                    heightRatio: 1,
                    open: "fixed",
                    role: "fix"
                },
                {
                    id: "K2",
                    kind: "panel",
                    widthRatio: 0.5,
                    heightRatio: 1,
                    open: "fixed",
                    role: "fix"
                }
            ]
        }
    },

    // MẪU 16 - Vách chia 2 ô ngang
    "V2_HORIZONTAL": {
        id: "V2_HORIZONTAL",
        name: "Vách chia 2 ô ngang",
        type: "fixed",
        layout: {
            id: "ROOT",
            kind: "group",
            split: "horizontal",
            children: [
                {
                    id: "K1",
                    kind: "panel",
                    widthRatio: 1,
                    heightRatio: 0.5,
                    open: "fixed",
                    role: "fix"
                },
                {
                    id: "K2",
                    kind: "panel",
                    widthRatio: 1,
                    heightRatio: 0.5,
                    open: "fixed",
                    role: "fix"
                }
            ]
        }
    },

    // MẪU 17 - Vách chia 3 ô
    "V3": {
        id: "V3",
        name: "Vách chia 3 ô",
        type: "fixed",
        layout: {
            id: "ROOT",
            kind: "group",
            split: "vertical",
            children: [
                {
                    id: "K1",
                    kind: "panel",
                    widthRatio: 0.33,
                    heightRatio: 1,
                    open: "fixed",
                    role: "fix"
                },
                {
                    id: "K2",
                    kind: "panel",
                    widthRatio: 0.34,
                    heightRatio: 1,
                    open: "fixed",
                    role: "fix"
                },
                {
                    id: "K3",
                    kind: "panel",
                    widthRatio: 0.33,
                    heightRatio: 1,
                    open: "fixed",
                    role: "fix"
                }
            ]
        }
    },

    // MẪU 18 - Cửa đi 2 cánh + fix trên
    "D2_FIX_TOP": {
        id: "D2_FIX_TOP",
        name: "Cửa đi 2 cánh + fix trên",
        type: "door_with_fix",
        layout: {
            id: "ROOT",
            kind: "group",
            split: "horizontal",
            children: [
                {
                    id: "FIX_TOP",
                    kind: "panel",
                    widthRatio: 1,
                    heightRatio: 0.2,
                    open: "fixed",
                    role: "fix"
                },
                {
                    id: "DOOR_GROUP",
                    kind: "group",
                    split: "vertical",
                    widthRatio: 1,
                    heightRatio: 0.8,
                    children: [
                        {
                            id: "K1",
                            kind: "panel",
                            widthRatio: 0.5,
                            heightRatio: 1,
                            open: "left",
                            role: "sash"
                        },
                        {
                            id: "K2",
                            kind: "panel",
                            widthRatio: 0.5,
                            heightRatio: 1,
                            open: "right",
                            role: "sash"
                        }
                    ]
                }
            ]
        }
    },

    // MẪU 19 - Cửa đi 4 cánh + fix trên
    "D4_FIX_TOP": {
        id: "D4_FIX_TOP",
        name: "Cửa đi 4 cánh + fix trên",
        type: "door_with_fix",
        layout: {
            id: "ROOT",
            kind: "group",
            split: "horizontal",
            children: [
                {
                    id: "FIX_TOP",
                    kind: "panel",
                    widthRatio: 1,
                    heightRatio: 0.2,
                    open: "fixed",
                    role: "fix"
                },
                {
                    id: "DOOR_GROUP",
                    kind: "group",
                    split: "vertical",
                    widthRatio: 1,
                    heightRatio: 0.8,
                    children: [
                        {
                            id: "K1",
                            kind: "panel",
                            widthRatio: 0.25,
                            heightRatio: 1,
                            open: "left",
                            role: "sash"
                        },
                        {
                            id: "K2",
                            kind: "panel",
                            widthRatio: 0.25,
                            heightRatio: 1,
                            open: "right",
                            role: "sash"
                        },
                        {
                            id: "K3",
                            kind: "panel",
                            widthRatio: 0.25,
                            heightRatio: 1,
                            open: "left",
                            role: "sash"
                        },
                        {
                            id: "K4",
                            kind: "panel",
                            widthRatio: 0.25,
                            heightRatio: 1,
                            open: "right",
                            role: "sash"
                        }
                    ]
                }
            ]
        }
    },

    // MẪU 20 - Cửa đi 1 cánh + fix bên
    "D1_FIX_SIDE": {
        id: "D1_FIX_SIDE",
        name: "Cửa đi 1 cánh + fix bên",
        type: "door_with_fix",
        layout: {
            id: "ROOT",
            kind: "group",
            split: "vertical",
            children: [
                {
                    id: "FIX_SIDE",
                    kind: "panel",
                    widthRatio: 0.3,
                    heightRatio: 1,
                    open: "fixed",
                    role: "fix"
                },
                {
                    id: "K1",
                    kind: "panel",
                    widthRatio: 0.7,
                    heightRatio: 1,
                    open: "right",
                    role: "sash"
                }
            ]
        }
    }
};

// Export để sử dụng
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { TEMPLATES };
}

























