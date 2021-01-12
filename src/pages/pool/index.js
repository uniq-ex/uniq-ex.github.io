import { client } from '@ont-dev/ontology-dapi'
import React, { useState, useEffect } from 'react'
import { useHistory } from "react-router-dom"
import { useMappedState } from 'redux-react-hook';
import { utils } from 'ontology-ts-sdk'
import { useFetchPairs } from '../../hooks/usePair'
import { SWAP_ADDRESS } from '../../config'
import { SLIPPAGE } from '../../utils/constants'
import './index.css'

const { StringReader } = utils

const Pool = () => {
  const [liquidityBalance, setLiquidityBalance] = useState([])
  const { account, pairs } = useMappedState((state) => ({
    account: state.wallet.account,
    pairs: state.swap.pairs
  }))

  const history = useHistory()

  useFetchPairs()

  useEffect(() => {
    if (account && pairs.length) {
      Promise.all(pairs.map((p) => getLiquidityBalanceByPairId(p.id))).then((resp) => {
        setLiquidityBalance(resp)
      })
    }
  }, [account, pairs])

  function getLiquidityBalanceByPairId(id) {
    return client.api.smartContract.invokeWasmRead({
      scriptHash: SWAP_ADDRESS,
      operation: 'balanceOf',
      args: [
        {
          type: 'Long',
          value: id
        },
        {
          type: 'Address',
          value: account
        }
      ]
    }).then((resp) => {
      const strReader = new StringReader(resp)
      return { [id]: strReader.readUint128() }
    })
  }

  function onNavigateToSwap() {
    history.push('/swap')
  }

  function generateLiquidityList() {
    
  }

  return (
    <div className="pool-wrapper">
      <div className="pool-container">
        <div className="sw-tabs">
          <div className="sw-tab" onClick={() => onNavigateToSwap()}>Swap</div>
          <div className="sw-tab active">Pool</div>
        </div>
        <div className="pool-content">
          <div className="pool-add-liquidity-btn">Add Liquidity</div>
          <div className="pool-liquidity-list">
            <div className="my-liquidity">My Liquidities</div>
            {generateLiquidityList()}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Pool