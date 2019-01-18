import get from 'lodash/get'
import Helmet from 'react-helmet'
import React from 'react'
import striptags from 'striptags'
import { StaticQuery, graphql } from 'gatsby'

import Layout from '../components/Layout'
import SitePost from '../components/SitePost'
import SitePage from '../components/SitePage'

class BlogPostTemplate extends React.Component {
  render() {
    const post = get(this, 'props.data.post')
    const site = get(this, 'props.data.site')
    const layout = get(post, 'frontmatter.layout')
    const title = get(post, 'frontmatter.title')
    const siteTitle = get(site, 'meta.title')
    const location = get(this, 'props.location')
    const time = get(post, 'fields.readingTime.text')
    console.log(this.props.location)

    let template = ''
    if (layout != 'page') {
      template = (
        <SitePost data={post} site={site} isIndex={false} time={time} />
      )
    } else {
      template = <SitePage {...this.props} />
    }
    return (
      <Layout location={location}>
        <div>
          <Helmet
            title={`${title} | ${siteTitle}`}
            meta={[
              { name: 'twitter:card', content: 'summary' },
              {
                name: 'twitter:site',
                content: `@${get(site, 'meta.twitter')}`,
              },
              { property: 'og:title', content: get(post, 'frontmatter.title') },
              { property: 'og:type', content: 'article' },
              {
                property: 'og:description',
                content: striptags(get(post, 'html')).substr(0, 200),
              },
              {
                property: 'og:url',
                content: get(site, 'meta.url') + get(post, 'frontmatter.path'),
              },
            ]}
          />
          {template}
        </div>
      </Layout>
    )
  }
}

export default BlogPostTemplate

// export default ({ children }) => (
//   <StaticQuery
//     query={graphql`
//       query BlogPostByPath($path: String!) {
//         site {
//           meta: siteMetadata {
//             title
//             description
//             url: siteUrl
//             author
//             twitter
//             adsense
//           }
//         }
//         post: markdownRemark(frontmatter: { path: { eq: $path } }) {
//           id
//           html
//           fileAbsolutePath
//           frontmatter {
//             layout
//             title
//             path
//             categories
//             date(formatString: "YYYY/MM/DD")
//           }
//         }
//       }
//     `}
//     render={data => (
//       <>
//         <BlogPostTemplate data={data} />
//       </>
//     )}
//   />
// )

export const pageQuery = graphql`
  query BlogPostByPath($slug: String!) {
    site {
      meta: siteMetadata {
        title
        description
        url: siteUrl
        author
        twitter
        adsense
      }
    }
    post: markdownRemark(frontmatter: { path: { eq: $slug } }) {
      id
      html
      fileAbsolutePath
      frontmatter {
        layout
        title
        path
        categories
        date(formatString: "YYYY/MM/DD")
      }
      fields {
        readingTime {
          text
        }
      }
    }
  }
`
