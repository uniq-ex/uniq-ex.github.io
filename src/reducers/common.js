const initState = {
  isUpgrading: false,
  loadingToken: true,
  stopInterval: false,
  tokens: []
}

export const common = (state = initState, action) => {
  switch (action.type) {
    case 'SET_IS_UPGRADING':
      return { ...state, isUpgrading: action.isUpgrading }
    case 'SET_LOADING_TOKEN':
      return { ...state, loadingToken: action.loadingToken }
    case 'SET_STOP_INTERVAL':
      return { ...state, stopInterval: action.stopInterval }
    case 'SET_TOKENS':
      return { ...state, tokens: action.tokens }
    default:
      return { ...state }
  }
}
