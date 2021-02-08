import { client } from '@ont-dev/ontology-dapi'
import React, { useState, useEffect } from 'react'
import { useHistory } from "react-router-dom"
import { utils } from 'ontology-ts-sdk'
import BigNumber from 'bignumber.js'
import Tooltip from 'rc-tooltip';
import { useAlert } from 'react-alert'
import { useMappedState } from 'redux-react-hook'
import { STAKING_ADDRESS } from '../../config'
import { getLPTokenDom } from '../../utils/token'

import 'rc-tooltip/assets/bootstrap.css'
import './index.css'

const { StringReader } = utils

const Staking = () => {
  const [stakingTokens, setStakingTokens] = useState([])
  const { account, tokens } = useMappedState((state) => ({
    account: state.wallet.account,
    tokens: state.common.tokens
  }))

  const history = useHistory()
  const Alert = useAlert()

  useEffect(() => {
    getStakingTokenBalance()
    let interval = setInterval(() => getStakingTokenBalance, 2000)
    return () => {
      interval && clearInterval(interval)
    }
  }, [tokens])

  function getStakingTokenBalance() {
    if (tokens.length) {
      try {
        client.api.smartContract.invokeWasmRead({
          scriptHash: STAKING_ADDRESS,
          operation: 'stat',
          args: []
        }).then((statStr) => {
          const parsedTokens = []
          const strReader = new StringReader(statStr)
          const tokenCount = strReader.readNextLen()
          for (let i = 0; i < tokenCount; i++) {
            const token = {}
            token.id = strReader.readUint128()
            const tempToken = tokens.find((t) => t.id === token.id)
            token.weight = strReader.readUint128()
            token.balance = strReader.readUint128()

            parsedTokens.push(Object.assign(tempToken, token))
          }

          const tokenMap = {}
          for (let i = 0; i < parsedTokens.length; i++) {
            tokenMap[parsedTokens[i].id] = parsedTokens[i]
          }

          const totalWeight = Object.values(tokenMap).filter((t) => t.balance).reduce((a, b) => a + b.weight, 0)
          const filteredTokens = Object.values(tokenMap).map((t) => {
            return {
              ...t,
              originWeight: t.weight,
              weight: t.balance ? (t.weight / totalWeight) : 0
            }
          })

          setStakingTokens(filteredTokens)
        })
        .catch((e) => {
          console.log(e)
        })
      } catch (e) {
        console.log(e)
      }
    }
  }

  // useEffect(() => {
  //   client.api.smartContract.invokeWasmRead({
  //     scriptHash: STAKING_ADDRESS,
  //     operation: 'staking_info',
  //     args: []
  //   })
  //   .then((infoStr) => {
  //     const info = {}
  //     const strReader = new StringReader(infoStr)
  //     info.amount = strReader.readUint128()
  //     info.period = strReader.readUint128()
  //     info.start_time = strReader.readUint128()
  //     info.settled_time = strReader.readUint128()
  //     info.interest = info.amount / info.period

  //     setStakingInfo(info)
  //   })
  //   .catch((e) => {
  //     handleError(e, (errorCode) => {
  //       if (errorCode === 'CONTRACT_ADDRESS_ERROR') {
  //         setStopStakingInterval(true)
  //       } else {
  //         console.log('get staking info', e)
  //       }
  //     })
  //   })
  // }, [])

  function onSelectToken(token) {
    if (!account) {
      Alert.show('Please Connect Wallet First')
      return
    }
    history.push(`/staking/${token.id}`)
  }

  function getTip(token) {
    return `${token.name} is the hidden receipt for WING ${token.name.replace('f', '')} suppliers`
  }

  function generateStakingPool() {
    if (stakingTokens.length) {
      return stakingTokens.map((token) => {
        return (
          <div className="pool-list-item" key={token.name}>
            <div className="item-detail">
              <div className="item-detail-wrapper">
                { token.ty === 4 && <div className="corner-badge">10X</div> }
                <div className="staking-token">
                  {
                    token.ty === 4 ? (
                      <div className="staking-text">Deposit
                        {getLPTokenDom(token.name, 'stake-lp-token')}
                      </div>
                    ) : (
                      <div className={`staking-text icon-${token.name}`}>Deposit</div>
                    )
                  }
                  {
                    token.name.startsWith('f') ? (
                      <Tooltip placement="top" overlay={getTip(token)}>
                        <div className="staking-token-name">{token.name}</div>
                      </Tooltip>
                    ) : <div className="staking-token-name">{token.name}</div>
                  }
                </div>
                <div className="earn-line">Earn<span>UNX</span></div>
                <div className="total-staking">Total Staking<span>{new BigNumber(token.balance || 0).div(10 ** token.decimals).toString()}</span></div>
                <div className="select-btn" onClick={() => onSelectToken(token)}>Stake</div>
              </div>
            </div>
          </div>
        )
      })
    }
  }

  return (
    <div className="stake-container">
      <div className="stake-pool">
        <div className="title"></div>
        <div className="pool-list">
          {generateStakingPool()}
        </div>
      </div>
    </div>
  )
}

export default Staking