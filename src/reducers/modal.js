const initState = {
  infoModal: {
    show: false,
    type: '',
    text: '',
    extraText: '',
    extraLink: ''
  },
}

export const modal = (state = initState, action) => {
  switch (action.type) {
    case 'SET_MODAL':
      return { ...state, [action.modalType]: action.modalDetail }
    default:
      return { ...state }
  }
}