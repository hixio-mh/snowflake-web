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
            <p class="jumbotron-lead">
              An extensible framework and frontend for modern emulators.
            </p>
          </div>
        </div>
      </div>
    )
  }
}

export default Jumbotron
