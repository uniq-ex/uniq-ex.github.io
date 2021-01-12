const initState = {
  account: localStorage.getItem('account')
}

export const wallet = (state = initState, action) => {
  switch (action.type) {
    case 'SET_ACCOUNT':
      return { ...state, account: action.account }
    default:
      return { ...state }
  }
}