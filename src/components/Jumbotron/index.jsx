import React from 'react'
import Link from 'gatsby-link'
import get from 'lodash/get'
import './style.scss'

class Jumbotron extends React.Component {
  render() {

    return (
      <div>
        <div className="jumbotron jumbotron-home text-center">
          <div className="container centered">
            <img src="/svg/logo.svg" style={{ pointerEvents: 'none', height: 300, width: 300 }} />
            <p className="jumbotron-lead">
              An extensible framework and frontend for modern emulators.
            </p>
          </div>
        </div>
        <div className="subtron text-center">
          Snowflake is still under heavy development. Follow our progress on <a href="https://github.com/SnowflakePowered/snowflake">GitHub</a>.
        </div>
      </div>
    )
  }
}

export default Jumbotron
