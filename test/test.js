
var assert = require('assert')
var fs = require('fs')
var net = require('net')
var zlib = require('zlib')

var destroy = require('..')

describe('destroy', function () {
  it('should destroy a stream', function () {
    var stream = fs.createReadStream('package.json')
    assert(!isdestroyed(stream))
    destroy(stream)
    assert(isdestroyed(stream))
  })

  it('should handle falsey values', function () {
    destroy()
  })

  it('should handle random object', function () {
    destroy({})
  })

  describe('ReadStream', function () {
    it('should not leak fd when called sync to open', function (done) {
      // this test will timeout on a fd leak
      var _close = fs.close
      var _open = fs.open
      var waitclose = false

      function cleanup () {
        fs.close = _close
        fs.open = _open
      }

      fs.close = function close () {
        _close.apply(this, arguments)
        cleanup()
        done()
      }

      fs.open = function open () {
        waitclose = true
        _open.apply(this, arguments)
      }

      var stream = fs.createReadStream('package.json')
      destroy(stream)
      assert(isdestroyed(stream))

      if (waitclose) {
        return
      }

      cleanup()
      done()
    })
  })

  describe('Socket', function () {
    it('should destroy a socket', function (done) {
      var server = net.createServer(function (connection) {
        socket.on('close', function () {
          done()
        })
        destroy(connection)
      })
      var socket

      server.listen(0, function () {
        socket = net.connect(this.address().port)
      })
    })
  })

  describe('Zlib', function () {
    var version = process.versions.node.split('.').map(function (n) {
      return Number(n)
    })
    var preNode0_10 = version[0] === 0 && version[1] < 10
    var types = ['Gzip', 'Gunzip', 'Deflate', 'DeflateRaw', 'Inflate', 'InflateRaw', 'Unzip']

    types.forEach(function (type) {
      var method = 'create' + type

      describe('.' + type, function () {
        describe('when call sync', function () {
          it('should destory stream', function () {
            var stream = zlib[method]()
            destroy(stream)
            if (preNode0_10) {
              assert.strictEqual(stream._ended, true)
            } else {
              assert.strictEqual(stream._closed, true)
            }
          })
        })

        describe('when call async', function () {
          it('should destroy stream', function (done) {
            var stream = zlib[method]()
            setTimeout(function () {
              destroy(stream)
              if (preNode0_10) {
                assert.strictEqual(stream._ended, true)
              } else {
                assert.strictEqual(stream._closed, true)
              }
              done()
            }, 0)
          })
        })
      })
    })
  })
})

function isdestroyed (stream) {
  // readable for 0.8, destroyed for 0.10+
  return stream.readable === false || stream.destroyed === true
}
