import React from 'react'

import './style.scss'

class JumbotronHeader extends React.Component {
  render() {
    return (
      <div>
        <div className="jumbotron text-center jumbotron-header jumbotron-header-dark">
          <div className="container centered">
            <div className="display-3">{this.props.title}</div>
          </div>
        </div>
      </div>
    )
  }
}

export default JumbotronHeader
