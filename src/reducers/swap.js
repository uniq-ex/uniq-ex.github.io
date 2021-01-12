const initState = {
  tokens: [],
  pairs: []
}

export const swap = (state = initState, action) => {
  switch (action.type) {
    case 'SET_SWAP_TOKENS':
      return { ...state, tokens: action.tokens }
    case 'SET_PAIRS':
      return { ...state, pairs: action.pairs }
    default:
      return { ...state }
  }
}
