var cloudinary = require('cloudinary'),
    Promise    = require('bluebird'),
    path       = require('path'),
    fs         = require('fs-extra'),
    storage    = require('../storage'),
    errors     = require('../errors'),

    upload;

function isImage(type, ext) {
    if ((type === 'image/jpeg' || type === 'image/png' || type === 'image/gif' || type === 'image/svg+xml')
            && (ext === '.jpg' || ext === '.jpeg' || ext === '.png' || ext === '.gif' || ext === '.svg' || ext === '.svgz')) {
        return true;
    }
    return false;
}

function isPdf(type, ext) {
  if (type === 'application/pdf' && ext === '.pdf') {
    return true;
  }
  return false;
}

/**
 * ## Upload API Methods
 *
 * **See:** [API Methods](index.js.html#api%20methods)
 */
upload = {

    /**
     * ### Add Image
     *
     * @public
     * @param {{context}} options
     * @returns {Promise} Success
     */
    add: function (options) {
        var store = storage.getStorage(),
            type,
            ext,
            filepath;

        if (!options.uploadimage || !options.uploadimage.type || !options.uploadimage.path) {
            return Promise.reject(new errors.NoPermissionError('Please select an image.'));
        }

        type = options.uploadimage.type;
        ext = path.extname(options.uploadimage.name).toLowerCase();
        filepath = options.uploadimage.path;

        return Promise.resolve(isImage(type, ext)).then(function (result) {
            if (!result) {
                return Promise.reject(new errors.UnsupportedMediaTypeError('Please select a valid image.'));
            }
        }).then(function () {
            return store.save(options.uploadimage);
        }).then(function (url) {
            return url;
        }).finally(function () {
            // Remove uploaded file from tmp location
            return Promise.promisify(fs.unlink)(filepath);
        });
    },

    /**
     * ### Add PDF
     *
     * @public
     * @param {{context}} options
     * @returns {Promise} Success
     */
    addPdf: function (options) {
        var store = storage.getStorage(),
            type,
            ext,
            filepath;

        if (!options.uploadpdf || !options.uploadpdf.type || !options.uploadpdf.path) {
            return Promise.reject(new errors.NoPermissionError('Please select a pdf.'));
        }

        type = options.uploadpdf.type;
        ext = path.extname(options.uploadpdf.name).toLowerCase();
        filepath = options.uploadpdf.path;

        return Promise.resolve(isPdf(type, ext)).then(function (result) {
            if (!result) {
                return Promise.reject(new errors.UnsupportedMediaTypeError('Please select a valid pdf.'));
            }
        }).then(function () {
            return store.savePdf(options.uploadpdf);
        }).then(function (url) {
            pdfUrl = url;
            var fullPath = process.cwd() + url;
            // upload pdf to cloudinary, generate image for first page of pdf
            return new Promise(function (resolve) {
              cloudinary.uploader.upload(fullPath, function (result) {
                return resolve(result);
              });
            });
        }).then(function (result) {
            return new Promise(function (resolve) {
              return resolve(cloudinary.url(result.public_id, {
                format: "jpg",
                width: 850,
                height: 1100,
                crop: "fill"
              }));
            });
        }).then(function (imgUrl) {
            return {
              pdfUrl: pdfUrl,
              imgUrl: imgUrl,
            }
        }).finally(function () {
            // Remove uploaded file from tmp location
            return Promise.promisify(fs.unlink)(filepath);
        });
    },
};

module.exports = upload;
