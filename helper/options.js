module.exports = {
    formate: 'A4',
    orientation: 'portrait',
    border: '12mm',
    timeout: '100000',
    childProcessOptions: {
        env: {
          OPENSSL_CONF: '/dev/null',
        },
      }
    // header: {
    //     height: '15mm',
    //     contents: '<h4 style=" color: red;font-size:20;font-weight:800;text-align:center;">S.D.M. Public High School</h4>'
    // },
    // footer: {
    //     height: '20mm',
    //     contents: {
    //         first: 'Cover page',
    //         2: 'Second page',
    //         default: '<span style="color: #444;">{{page}}</span>/<span>{{pages}}</span>', 
    //         last: 'Last Page'
    //     }
    // }
}