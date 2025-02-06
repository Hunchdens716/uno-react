const supportSymbol = typeof Symbol === "function" && Symbol.for;

export const REACT_ELEMENT_TYPE = supportSymbol
    ? Symbol.for("React.element")
    : 0xeac7;

export const REACT_FRAGMENT_TYPE = supportSymbol
    ? Symbol.for("React.fragment")
    : 0xeacb;