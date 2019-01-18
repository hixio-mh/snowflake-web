import React from 'react'
import get from 'lodash/get'
import sortBy from 'lodash/sortBy'
import Helmet from 'react-helmet'
import LazyLoad from 'react-lazyload'
import Layout from '../../components/Layout'
import { StaticQuery, graphql } from 'gatsby'
import SitePost from '../../components/SitePost'
import JumbotronHeader from '../../components/JumbotronHeader'

class BlogIndex extends React.Component {
  render() {
    const pageLinks = []
    const site = get(this, 'props.data.site.siteMetadata')
    const posts = get(this, 'props.data.remark.posts')
    const { location } = this.props

    const sortedPosts = sortBy(posts, post =>
      get(post, 'post.frontmatter.date')
    ).reverse()

    console.log(sortedPosts)

    sortedPosts.forEach((data, i) => {
      const layout = get(data, 'post.frontmatter.layout')
      const path = get(data, 'post.path')
      if (layout === 'post' && path !== '/404/') {
        pageLinks.push(
          <LazyLoad height={500} offset={500} once={true} key={i}>
            <SitePost
              data={data.post}
              site={site}
              isIndex={true}
              key={i}
              location={location}
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
          <JumbotronHeader title="Blog" />
          {pageLinks}
        </div>
      </Layout>
    )
  }
}

export default ({ children, location }) => (
  <StaticQuery
    query={graphql`
      query IndexFullQuery {
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
        <BlogIndex data={data} location={location} />
      </>
    )}
  />
)

// export default BlogIndex

// export const pageQuery = graphql`
//   query IndexFullQuery {
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
