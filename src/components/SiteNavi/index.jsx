import React from 'react'
import Link from 'gatsby-link'
import './style.scss'

class SiteNavi extends React.Component {
  render() {
    const { location, title } = this.props
    return (
      <header className="navbar navbar-expand navbar-light flex-column flex-md-row bd-navbar bg-primary">
        <Link className="navbar-brand mr-0 mr-md-2" to="/" aria-label="Snowflake">
          <img src="/svg/banner.svg" style={{height: 63, width: 300, pointerEvents: 'none', padding: 0, margin: 0}}/>
        </Link>

        <div className="navbar-nav-scroll ml-md-auto">
          <ul className="navbar-nav bd-navbar-nav">
            <li
              className={
                location.pathname === '/' ? 'nav-item active' : 'nav-item'
              }
            >
              <Link to="/" className="nav-link">
                Home
              </Link>
            </li>
            <li
              className={
                location.pathname.startsWith('/blog') || location.pathname === '/blog' ? 'nav-item active' : 'nav-item'
              }
            >
              <Link to="/blog" className="nav-link">
                Blog
              </Link>
            </li>
            <li
              className={
                location.pathname === '/profile/'
                  ? 'nav-item active'
                  : 'nav-item'
              }
            >
            <a className="nav-link" href="https://docs.snowflakepowe.red/">Docs</a>
            <a className="nav-link" href="https://github.com/SnowflakePowered">GitHub</a>
            </li>
          </ul>
        </div>
      </header>
    )
  }
}

export default SiteNavi
