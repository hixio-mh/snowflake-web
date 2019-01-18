import React from 'react'
import { siteMetadata } from '../../../gatsby-config'
import SiteNavi from '../SiteNavi'
import emergence from 'emergence.js'
import Footer from '../Footer'
import './gatstrap.scss'
import 'animate.css/animate.css'
import 'prismjs/themes/prism-okaidia.css'
import 'devicon/devicon.min.css'
import 'font-awesome/css/font-awesome.css'

class Layout extends React.Component {
  componentDidMount() {
    emergence.init()
  }

  componentDidUpdate() {
    emergence.init()
  }

  render() {
    const { children, location } = this.props
    return (
      <div>
        <SiteNavi
          title={siteMetadata.title}
          {...this.props}
          location={location}
        />
        {children}

        <Footer />
      </div>
    )
  }
}

export default Layout
