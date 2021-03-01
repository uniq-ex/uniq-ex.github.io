const initState = {
  liquidityBalance: []
}

export const pool = (state = initState, action) => {
  switch (action.type) {
    case 'SET_POOL_LIQUIDITY_BALANCE':
      return { ...state, liquidityBalance: action.liquidityBalance }
    default:
      return { ...state }
  }
}
