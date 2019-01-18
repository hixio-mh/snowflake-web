import React from 'react'
import './style.scss'

class Footer extends React.Component {
  render() {
    const data = this.props.data

    return (
      <footer className="footer">
        <div className="container text-left">
          <div>
            Built with ❤️ by <a href="https://twitter.com/chyyran">@chyyran</a>.
            Text content licensed under CC-BY-SA 4.0.
          </div>
        </div>
      </footer>
    )
  }
}

export default Footer
