import React from 'react'
import { StaticQuery, graphql } from 'gatsby'
import get from 'lodash/get'
import sortBy from 'lodash/sortBy'
import Helmet from 'react-helmet'
import LazyLoad from 'react-lazyload'
import Layout from '../components/Layout'

import PostExcerpt from '../components/PostExcerpt'
import Jumbotron from '../components/Jumbotron'
import { SSL_OP_ALLOW_UNSAFE_LEGACY_RENEGOTIATION } from 'constants'

class HomePage extends React.Component {
  render() {
    const pageLinks = []
    const { data, location } = this.props
    const site = get(data, 'site.siteMetadata')
    const posts = get(data, 'remark.posts')

    const sortedPosts = sortBy(posts, post =>
      get(post, 'post.frontmatter.date')
    )
      .reverse()
      .filter(
        post => !get(post, 'post.frontmatter.categories').includes('archive')
      )

    sortedPosts.forEach((postdata, i) => {
      const layout = get(postdata, 'post.frontmatter.layout')
      const path = get(postdata, 'post.path')
      if (layout === 'post' && path !== '/404/') {
        pageLinks.push(
          <LazyLoad height={500} offset={500} once={true} key={i}>
            <PostExcerpt
              data={postdata.post}
              location={SSL_OP_ALLOW_UNSAFE_LEGACY_RENEGOTIATION}
              site={site}
              isIndex={true}
              key={i}
            />
          </LazyLoad>
        )
      }
    })

    return (
      <Layout location={location}>
        <div>
          <Helmet
            title={get(site, 'title')}
            meta={[
              { name: 'twitter:card', content: 'summary' },
              { name: 'twitter:site', content: `@${get(site, 'twitter')}` },
              { property: 'og:title', content: get(site, 'title') },
              { property: 'og:type', content: 'website' },
              { property: 'og:description', content: get(site, 'description') },
              { property: 'og:url', content: get(site, 'url') },
              {
                property: 'og:image',
                content: `${get(site, 'url')}/img/profile.jpg`,
              },
            ]}
          />

          <Jumbotron />
          {pageLinks}
        </div>
      </Layout>
    )
  }
}

export default ({ children, location }) => (
  <StaticQuery
    query={graphql`
      query IndexQuery {
        site {
          siteMetadata {
            title
            description
            url: siteUrl
            author
            twitter
            adsense
          }
        }
        remark: allMarkdownRemark {
          posts: edges {
            post: node {
              html
              excerpt
              fileAbsolutePath
              frontmatter {
                layout
                title
                path
                categories
                date(formatString: "YYYY/MM/DD")
              }
            }
          }
        }
      }
    `}
    render={data => (
      <>
        <HomePage data={data} location={location} children={children} />
      </>
    )}
  />
)

// export default HomePage

// export const pageQuery = graphql`
//   query IndexQuery {
//     site {
//       siteMetadata {
//         title
//         description
//         url: siteUrl
//         author
//         twitter
//         adsense
//       }
//     }
//     remark: allMarkdownRemark {
//       posts: edges {
//         post: node {
//           html
//           excerpt
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
//     }
//   }
// `
