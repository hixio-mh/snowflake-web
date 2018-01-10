import React from 'react'
import Link from 'gatsby-link'
import get from 'lodash/get'
import './style.scss'

class JumbotronHeader extends React.Component {
  render() {

    return (
      <div>
        <div className="jumbotron text-center jumbotron-header jumbotron-header-dark">
          <div className="container centered">
            <div className="display-3">
              {this.props.title}
            </div>
          </div>
        </div>
      </div>
    )
  }
}

export default JumbotronHeader
