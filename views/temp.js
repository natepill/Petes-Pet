nav(aria-label='Page navigation example').d-flex.justify-content-center
  ul.pagination
    li.page-item
      a.page-link(href='#') Previous

    - var i = 1;
    while i <= pagesCount
      li.page-item
        a.page-link(href=`?pages=${i}`)= i++

    li.page-item
      a.page-link(href='#') Next



      
