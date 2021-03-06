import React, { PureComponent } from 'react'
import { connect } from 'react-redux'
import { get } from 'lodash'
import PropTypes from 'prop-types'
import { join } from 'path-extra'
import { avatarWorker } from 'views/services/worker'
import FontAwesome from 'react-fontawesome'
import { readJsonSync } from 'fs-extra'

import './assets/avatar.css'

const { APPDATA_PATH, getStore, ROOT } = window

const avatarCachePath = join(APPDATA_PATH, 'avatar','cache')
const serverList = Object.keys(readJsonSync(join(ROOT, 'assets', 'data', 'server.json')))


export const Avatar = connect((state, props) => ({
  marginMagic: props.marginMagic || get(state, `fcd.shipavatar.marginMagics.${props.mstId}.${props.isDamaged ? 'damaged' : 'normal'}`),
}))(class avatar extends PureComponent {
  static propTypes = {
    mstId: PropTypes.number.isRequired,
    height: PropTypes.number,
    marginMagic: PropTypes.number,
    isDamaged: PropTypes.bool,
  }

  static defaultProps = {
    height: 121,
    marginMagic: 0.555,
    isDamaged: false,
  }

  state = {
    available: false,
    failed: false,
  }

  onMessage = e => {
    if (e.data[1] === this.props.mstId) {
      if (e.data[0] === 'Ready') {
        this.setState({ available: true })
      } else if (e.data[0] === 'Failed') {
        this.setState({ failed: true })
      }
    }
  }

  sendMessage = mstId => {
    avatarWorker.postMessage([
      'Request',
      mstId,
      getStore(`const.$graphs.${mstId}.api_version`),
      getStore(`const.$graphs.${mstId}.api_filename`),
      getStore('info.server.ip', serverList[Math.floor(Math.random() * serverList.length)]),
    ])
  }

  componentDidMount = () => {
    avatarWorker.addEventListener('message', this.onMessage)
    this.sendMessage(this.props.mstId)
  }

  componentWillUnmount = () => {
    avatarWorker.removeEventListener('message', this.onMessage)
  }

  componentWillReceiveProps = nextProps => {
    if (this.props.mstId !== nextProps.mstId) {
      this.setState({ available: false })
      this.sendMessage(nextProps.mstId)
    }
  }

  render() {
    return (
      <div className="ship-avatar-container" data-mstid={this.props.mstId} data-damaged={this.props.isDamaged} style={{
        width: Math.round(1.85 * this.props.height),
        height: this.props.height,
      }}>
        {
          this.state.failed ?
            <div className="ship-avatar-loading"><FontAwesome name='times' /></div>
            : this.state.available ?
              <img
                className="ship-avatar"
                style={{ height: this.props.height, marginLeft: -Math.round(this.props.marginMagic * this.props.height) }}
                src={join(avatarCachePath, `${this.props.mstId}_${this.props.isDamaged ? 'd' : 'n'}.png`)} />
              : <div className="ship-avatar-loading"><FontAwesome name='spinner' pulse /></div>
        }
      </div>
    )
  }
})
