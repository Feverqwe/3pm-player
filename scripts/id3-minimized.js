/**
 * Copyright (c) 2010, António Afonso <antonio.afonso gmail.com>. All rights reserved.
 * 
 * Redistribution and use in source and binary forms, with or without modification, are
 * permitted provided that the following conditions are met:
 * 
 *    1. Redistributions of source code must retain the above copyright notice, this list of
 *       conditions and the following disclaimer.
 * 
 *    2. Redistributions in binary form must reproduce the above copyright notice, this list
 *       of conditions and the following disclaimer in the documentation and/or other materials
 *       provided with the distribution.
 * 
 * THIS SOFTWARE IS PROVIDED BY António Afonso ``AS IS'' AND ANY EXPRESS OR IMPLIED
 * WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND
 * FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL <COPYRIGHT HOLDER> OR
 * CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
 * CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
 * SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON
 * ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
 * NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF
 * ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */
var StringUtils = {
    readUTF16String: function(bytes, bigEndian, maxBytes) {
        var ix = 0;
        var offset1 = 1, offset2 = 0;
        maxBytes = Math.min(maxBytes || bytes.length, bytes.length);

        if (bytes[0] == 0xFE && bytes[1] == 0xFF) {
            bigEndian = true;
            ix = 2;
        } else if (bytes[0] == 0xFF && bytes[1] == 0xFE) {
            bigEndian = false;
            ix = 2;
        }
        if (bigEndian) {
            offset1 = 0;
            offset2 = 1;
        }

        var arr = [];
        for (var j = 0; ix < maxBytes; j++) {
            var byte1 = bytes[ix + offset1];
            var byte2 = bytes[ix + offset2];
            var word1 = (byte1 << 8) + byte2;
            ix += 2;
            if (word1 == 0x0000) {
                break;
            } else if (byte1 < 0xD8 || byte1 >= 0xE0) {
                arr[j] = String.fromCharCode(word1);
            } else {
                var byte3 = bytes[ix + offset1];
                var byte4 = bytes[ix + offset2];
                var word2 = (byte3 << 8) + byte4;
                ix += 2;
                arr[j] = String.fromCharCode(word1, word2);
            }
        }
        var string = new String(arr.join(""));
        string.bytesReadCount = ix;
        return string;
    },
    readUTF8String: function(bytes, maxBytes) {
        var ix = 0;
        maxBytes = Math.min(maxBytes || bytes.length, bytes.length);

        if (bytes[0] == 0xEF && bytes[1] == 0xBB && bytes[2] == 0xBF) {
            ix = 3;
        }

        var arr = [];
        for (var j = 0; ix < maxBytes; j++) {
            var byte1 = bytes[ix++];
            if (byte1 == 0x00) {
                break;
            } else if (byte1 < 0x80) {
                arr[j] = String.fromCharCode(byte1);
            } else if (byte1 >= 0xC2 && byte1 < 0xE0) {
                var byte2 = bytes[ix++];
                arr[j] = String.fromCharCode(((byte1 & 0x1F) << 6) + (byte2 & 0x3F));
            } else if (byte1 >= 0xE0 && byte1 < 0xF0) {
                var byte2 = bytes[ix++];
                var byte3 = bytes[ix++];
                arr[j] = String.fromCharCode(((byte1 & 0xFF) << 12) + ((byte2 & 0x3F) << 6) + (byte3 & 0x3F));
            } else if (byte1 >= 0xF0 && byte1 < 0xF5) {
                var byte2 = bytes[ix++];
                var byte3 = bytes[ix++];
                var byte4 = bytes[ix++];
                var codepoint = ((byte1 & 0x07) << 18) + ((byte2 & 0x3F) << 12) + ((byte3 & 0x3F) << 6) + (byte4 & 0x3F) - 0x10000;
                arr[j] = String.fromCharCode(
                        (codepoint >> 10) + 0xD800,
                        (codepoint & 0x3FF) + 0xDC00
                        );
            }
        }
        var string = new String(arr.join(""));
        string.bytesReadCount = ix;
        return string;
    },
    readNullTerminatedString: function(bytes, maxBytes) {
        var arr = [];
        maxBytes = maxBytes || bytes.length;
        for (var i = 0; i < maxBytes; ) {
            var byte1 = bytes[i++];
            if (byte1 == 0x00)
                break;
            arr[i - 1] = String.fromCharCode(byte1);
        }
        var string = new String(arr.join(""));
        string.bytesReadCount = i;
        return string;
    }
};
/**
 * Buffered Binary Ajax 0.2.1
 * Copyright (c) 2010 António Afonso, antonio.afonso gmail, http://www.aadsm.net/
 * MIT License [http://www.opensource.org/licenses/mit-license.php]
 *
 * Adapted from Binary Ajax 0.1.5 
 */

/**
 * This function prepares a BufferedBinaryFile object for reading the file pointed by the URL given.
 *
 * @param {String} strUrl The URL with the location of the file to be read.
 * @param {function(BufferedBinaryFile)} fncCallback The function that will be invoked when the BufferedBinaryFile is ready to be used.
 * @param {function()} fncError The function that will be invoked when an error occrus, for instance, the file pointed by the URL is doesn't exist.
 */
var BufferedBinaryAjax = function(strUrl, fncCallback, fncError) {
    function sendRequest(strURL, fncCallback, fncError, aRange, bAcceptRanges, iFileSize, bAsync) {
        var oHTTP = createRequest();
        if (oHTTP) {
            var iDataOffset = 0;
            if (aRange && !bAcceptRanges) {
                iDataOffset = aRange[0];
            }
            var iDataLen = 0;
            if (aRange) {
                iDataLen = aRange[1] - aRange[0] + 1;
            }
            if (typeof bAsync === "undefined")
                bAsync = true;

            if (fncCallback) {
                if (typeof (oHTTP.onload) != "undefined") {
                    oHTTP.onload = function() {

                        if (oHTTP.status == "200" || oHTTP.status == "206") {
                            oHTTP.fileSize = iFileSize || oHTTP.getResponseHeader("Content-Length");
                            fncCallback(oHTTP);
                        } else {
                            if (fncError)
                                fncError();
                        }
                        oHTTP = null;
                    };
                } else {
                    oHTTP.onreadystatechange = function() {
                        if (oHTTP.readyState == 4) {
                            if (oHTTP.status == "200" || oHTTP.status == "206") {
                                oHTTP.fileSize = iFileSize || oHTTP.getResponseHeader("Content-Length");
                                fncCallback(oHTTP);
                            } else {
                                if (fncError)
                                    fncError();
                            }
                            oHTTP = null;
                        }
                    };
                }
            }
            oHTTP.open("GET", strURL, bAsync);

            if (oHTTP.overrideMimeType)
                oHTTP.overrideMimeType('text/plain; charset=x-user-defined');

            if (aRange && bAcceptRanges) {
                oHTTP.setRequestHeader("Range", "bytes=" + aRange[0] + "-" + aRange[1]);
            }

            oHTTP.setRequestHeader("If-Modified-Since", "Sat, 1 Jan 1970 00:00:00 GMT");

            oHTTP.send(null);
        } else {
            if (fncError)
                fncError();
        }
    }
    function createRequest() {
        var oHTTP = null;
        if (window.XMLHttpRequest) {
            oHTTP = new XMLHttpRequest();
        } else if (window.ActiveXObject) {
            oHTTP = new ActiveXObject("Microsoft.XMLHTTP");
        }
        return oHTTP;
    }

    function getHead(strURL, fncCallback, fncError) {
        var oHTTP = createRequest();
        if (oHTTP) {
            if (fncCallback) {
                if (typeof (oHTTP.onload) != "undefined") {
                    oHTTP.onload = function() {
                        if (oHTTP.status == "200") {
                            fncCallback(this);
                        } else {
                            if (fncError)
                                fncError();
                        }
                        oHTTP = null;
                    };
                } else {
                    oHTTP.onreadystatechange = function() {
                        if (oHTTP.readyState == 4) {
                            if (oHTTP.status == "200") {
                                fncCallback(this);
                            } else {
                                if (fncError)
                                    fncError();
                            }
                            oHTTP = null;
                        }
                    };
                }
            }
            oHTTP.open("HEAD", strURL, true);
            oHTTP.send(null);
        } else {
            if (fncError)
                fncError();
        }
    }

    /**
     * @class Reads a remote file without having to download it all.
     *
     * Creates a new BufferedBinaryFile that will download chunks of the file pointed by the URL given only on a per need basis.
     *
     * @param {string} strUrl The URL with the location of the file to be read.
     * @param {number} iLength The size of the file.
     * @param {number} [blockSize=2048] The size of the chunk that will be downloaded when data is read.
     * @param {number} [blockRadius=0] The number of chunks, immediately after and before the chunk needed, that will also be downloaded.
     *
     * @constructor
     * @augments BinaryFile
     */
    function BufferedBinaryFile(strUrl, iLength, blockSize, blockRadius) {
        var undefined;
        var downloadedBytesCount = 0;
        var binaryFile = new BinaryFile("", 0, iLength);
        var blocks = [];

        blockSize = blockSize || 1024 * 2;
        blockRadius = (typeof blockRadius === "undefined") ? 0 : blockRadius;
        blockTotal = ~~((iLength - 1) / blockSize) + 1;

        function getBlockRangeForByteRange(range) {
            var blockStart = ~~(range[0] / blockSize) - blockRadius;
            var blockEnd = ~~(range[1] / blockSize) + 1 + blockRadius;

            if (blockStart < 0)
                blockStart = 0;
            if (blockEnd >= blockTotal)
                blockEnd = blockTotal - 1;

            return [blockStart, blockEnd];
        }

        // TODO: wondering if a "recently used block" could help things around
        //       here.
        function getBlockAtOffset(offset) {
            var blockRange = getBlockRangeForByteRange([offset, offset]);
            waitForBlocks(blockRange);
            return blocks[~~(offset / blockSize)];
        }

        /**
         * @param {?function()} callback If a function is passed then this function will be asynchronous and the callback invoked when the blocks have been loaded, otherwise it blocks script execution until the request is completed.
         */
        function waitForBlocks(blockRange, callback) {
            // Filter out already downloaded blocks or return if found out that
            // the entire block range has already been downloaded.
            while (blocks[blockRange[0]]) {
                blockRange[0]++;
                if (blockRange[0] > blockRange[1])
                    return callback ? callback() : undefined;
            }
            while (blocks[blockRange[1]]) {
                blockRange[1]--;
                if (blockRange[0] > blockRange[1])
                    return callback ? callback() : undefined;
            }
            var range = [blockRange[0] * blockSize, (blockRange[1] + 1) * blockSize - 1];
            //console.log("Getting: " + range[0] + " to " +  range[1]);
            sendRequest(
                    strUrl,
                    function(http) {
                        var size = parseInt(http.getResponseHeader("Content-Length"), 10);
                        // Range header not supported
                        if (size == iLength) {
                            blockRange[0] = 0;
                            blockRange[1] = blockTotal - 1;
                            range[0] = 0;
                            range[1] = iLength - 1;
                        }
                        var block = {
                            data: http.responseBody || http.responseText,
                            offset: range[0]
                        };

                        for (var i = blockRange[0]; i <= blockRange[1]; i++) {
                            blocks[i] = block;
                        }
                        downloadedBytesCount += range[1] - range[0] + 1;
                        if (callback)
                            callback();
                    },
                    fncError,
                    range,
                    "bytes",
                    undefined,
                    !!callback
                    );
        }

        // Mixin all BinaryFile's methods.
        // Not using prototype linking since the constructor needs to know
        // the length of the file.
        for (var key in binaryFile) {
            if (binaryFile.hasOwnProperty(key) &&
                    typeof binaryFile[key] === "function") {
                this[key] = binaryFile[key];
            }
        }
        /** 
         * @override
         */
        this.getByteAt = function(iOffset) {
            var block = getBlockAtOffset(iOffset);
            if (typeof block.data == "string") {
                return block.data.charCodeAt(iOffset - block.offset) & 0xFF;
            } else if (typeof block.data == "unknown") {
                return IEBinary_getByteAt(block.data, iOffset - block.offset);
            }
        };

        /**
         * Gets the number of total bytes that have been downloaded.
         *
         * @returns The number of total bytes that have been downloaded.
         */
        this.getDownloadedBytesCount = function() {
            return downloadedBytesCount;
        };

        /**
         * Downloads the byte range given. Useful for preloading.
         *
         * @param {Array} range Two element array that denotes the first byte to be read on the first position and the last byte to be read on the last position. A range of [2, 5] will download bytes 2,3,4 and 5.
         * @param {?function()} callback The function to invoke when the blocks have been downloaded, this makes this call asynchronous.
         */
        this.loadRange = function(range, callback) {
            var blockRange = getBlockRangeForByteRange(range);
            waitForBlocks(blockRange, callback);
        };
    }

    function init() {
        getHead(
                strUrl,
                function(oHTTP) {
                    var iLength = parseInt(oHTTP.getResponseHeader("Content-Length"), 10) || -1;
                    fncCallback(new BufferedBinaryFile(strUrl, iLength));
                }
        );
    }

    init();
};


/**
 * 
 * @param {type} strUrl
 * @param {type} fncCallback
 * @param {type} fncError
 * @returns {undefined}
 */
var BufferedBinaryFileReader = function(file, fncCallback, fncError) {
    /**
     * @class Reads a remote file without having to download it all.
     *
     * Creates a new BufferedBinaryFile that will download chunks of the file pointed by the URL given only on a per need basis.
     *
     * @param {string} strUrl The URL with the location of the file to be read.
     * @param {number} iLength The size of the file.
     * @param {number} [blockSize=2048] The size of the chunk that will be downloaded when data is read.
     * @param {number} [blockRadius=0] The number of chunks, immediately after and before the chunk needed, that will also be downloaded.
     *
     * @constructor
     * @augments BinaryFile
     */
    var BufferedBinaryFile = function(file, iLength, blockSize, blockRadius) {
        var undefined;
        var downloadedBytesCount = 0;
        var binaryFile = new BinaryFile("", 0, iLength);
        var dataFile = new Uint8Array(iLength);
        var gotDataRange = [];
        var inRange = function(value) {
            var ex = 0;
            gotDataRange.forEach(function(item) {
                if (value >= item[0] && value < item[1]) {
                    ex = 1;
                    return 0;
                }
            });
            return ex;
        };

        /**
         * @param {?function()} callback If a function is passed then this function will be asynchronous and the callback invoked when the blocks have been loaded, otherwise it blocks script execution until the request is completed.
         */
        var waitForBlocks = function(range, callback) {
            while (inRange(range[0]) !== 0) {
                range[0]++;
                if (range[0] > range[1])
                    return callback ? callback() : undefined;
            }
            while (inRange(range[1]) !== 0) {
                range[1]--;
                if (range[0] > range[1])
                    return callback ? callback() : undefined;
            }
            var reader = new FileReader();
            reader.onload = function(event) {
                //console.log("Got range:", range);
                gotDataRange.push(range);
                var bytes = new Uint8Array(event.target.result);
                dataFile.set(bytes, range[0]);
                downloadedBytesCount += range[1] - range[0] + 1;
                if (callback)
                    callback();
            };
            reader.readAsArrayBuffer(file.slice(range[0], range[1]));
        };

        // Mixin all BinaryFile's methods.
        // Not using prototype linking since the constructor needs to know
        // the length of the file.
        for (var key in binaryFile) {
            if (binaryFile.hasOwnProperty(key) &&
                    typeof binaryFile[key] === "function") {
                this[key] = binaryFile[key];
            }
        }

        /** 
         * @override
         */
        this.getByteAt = function(offset) {
            var data = dataFile[offset];
            /*if (inRange(offset) === 0) {
                console.log("Data don't loaded:", offset, dataFile[offset]);
            }*/
            return data;
        };

        /**
         * Gets the number of total bytes that have been downloaded.
         *
         * @returns The number of total bytes that have been downloaded.
         */
        this.getDownloadedBytesCount = function() {
            return downloadedBytesCount;
        };

        /**
         * Downloads the byte range given. Useful for preloading.
         *
         * @param {Array} range Two element array that denotes the first byte to be read on the first position and the last byte to be read on the last position. A range of [2, 5] will download bytes 2,3,4 and 5.
         * @param {?function()} callback The function to invoke when the blocks have been downloaded, this makes this call asynchronous.
         */
        this.loadRange = function(range, callback) {
            waitForBlocks(range, callback);
        };
    };
    fncCallback(new BufferedBinaryFile(file, file.size));
};

/**
 * @constructor
 */
function BinaryFile(strData, iDataOffset, iDataLength) {
    var data = strData;
    var dataOffset = iDataOffset || 0;
    var dataLength = 0;

    this.getRawData = function() {
        return data;
    };

    if (typeof strData == "string") {
        dataLength = iDataLength || data.length;

        this.getByteAt = function(iOffset) {
            return data.charCodeAt(iOffset + dataOffset) & 0xFF;
        };
    } else if (typeof strData == "unknown") {
        dataLength = iDataLength || IEBinary_getLength(data);

        this.getByteAt = function(iOffset) {
            return IEBinary_getByteAt(data, iOffset + dataOffset);
        };
    }
    // @aadsm
    this.getBytesAt = function(iOffset, iLength) {
        var bytes = new Array(iLength);
        for (var i = 0; i < iLength; i++) {
            bytes[i] = this.getByteAt(iOffset + i);
        }
        return bytes;
    };

    this.getLength = function() {
        return dataLength;
    };

    // @aadsm
    this.isBitSetAt = function(iOffset, iBit) {
        var iByte = this.getByteAt(iOffset);
        return (iByte & (1 << iBit)) != 0;
    };

    this.getSByteAt = function(iOffset) {
        var iByte = this.getByteAt(iOffset);
        if (iByte > 127)
            return iByte - 256;
        else
            return iByte;
    };

    this.getShortAt = function(iOffset, bBigEndian) {
        var iShort = bBigEndian ?
                (this.getByteAt(iOffset) << 8) + this.getByteAt(iOffset + 1)
                : (this.getByteAt(iOffset + 1) << 8) + this.getByteAt(iOffset);
        if (iShort < 0)
            iShort += 65536;
        return iShort;
    };
    this.getSShortAt = function(iOffset, bBigEndian) {
        var iUShort = this.getShortAt(iOffset, bBigEndian);
        if (iUShort > 32767)
            return iUShort - 65536;
        else
            return iUShort;
    };
    this.getLongAt = function(iOffset, bBigEndian) {
        var iByte1 = this.getByteAt(iOffset),
                iByte2 = this.getByteAt(iOffset + 1),
                iByte3 = this.getByteAt(iOffset + 2),
                iByte4 = this.getByteAt(iOffset + 3);

        var iLong = bBigEndian ?
                (((((iByte1 << 8) + iByte2) << 8) + iByte3) << 8) + iByte4
                : (((((iByte4 << 8) + iByte3) << 8) + iByte2) << 8) + iByte1;
        if (iLong < 0)
            iLong += 4294967296;
        return iLong;
    };
    this.getSLongAt = function(iOffset, bBigEndian) {
        var iULong = this.getLongAt(iOffset, bBigEndian);
        if (iULong > 2147483647)
            return iULong - 4294967296;
        else
            return iULong;
    };
    // @aadsm
    this.getInteger24At = function(iOffset, bBigEndian) {
        var iByte1 = this.getByteAt(iOffset),
                iByte2 = this.getByteAt(iOffset + 1),
                iByte3 = this.getByteAt(iOffset + 2);

        var iInteger = bBigEndian ?
                ((((iByte1 << 8) + iByte2) << 8) + iByte3)
                : ((((iByte3 << 8) + iByte2) << 8) + iByte1);
        if (iInteger < 0)
            iInteger += 16777216;
        return iInteger;
    };
    this.getStringAt = function(iOffset, iLength) {
        var aStr = [];
        for (var i = iOffset, j = 0; i < iOffset + iLength; i++, j++) {
            aStr[j] = String.fromCharCode(this.getByteAt(i));
        }
        return aStr.join("");
    };
    // @aadsm
    this.getStringWithCharsetAt = function(iOffset, iLength, iCharset) {
        var bytes = this.getBytesAt(iOffset, iLength);
        var sString;

        switch (iCharset.toLowerCase()) {
            case 'utf-16':
            case 'utf-16le':
            case 'utf-16be':
                sString = StringUtils.readUTF16String(bytes, iCharset);
                break;

            case 'utf-8':
                sString = StringUtils.readUTF8String(bytes);
                break;

            default:
                sString = StringUtils.readNullTerminatedString(bytes);
                break;
        }

        return sString;
    };

    this.getCharAt = function(iOffset) {
        return String.fromCharCode(this.getByteAt(iOffset));
    };
    this.toBase64 = function() {
        return window.btoa(data);
    };
    this.fromBase64 = function(strBase64) {
        data = window.atob(strBase64);
    };

    this.loadRange = function(range, callback) {
        callback();
    };
}

/**
 * Copyright (c) 2010 António Afonso, antonio.afonso gmail, http://www.aadsm.net/
 * MIT License [http://www.opensource.org/licenses/mit-license.php]
 *
 */

(function(ns) {
    ns["FileAPIReader"] = function(file) {
        return function(url, fncCallback, fncError) {
            var reader = new FileReader();
            reader.onload = function(event) {
                var result = event.target.result;
                fncCallback(new BinaryFile(result));
            };
            var check_id3v2 = function(file, cb) {
                var id3v2_reader = new FileReader();
                id3v2_reader.onload = function(event) {
                    var data = event.target.result;
                    if (data.substr(0, 3) === "ID3") {
                        data = new BinaryFile(data);
                        var size = ns.ID3v2.readSynchsafeInteger32At(6, data);
                        var tags_body = file.slice(0, size);
                        cb(tags_body);
                    } else
                    if (data.substr(4, 7) === "ftypM4A") {
                        fncCallback("ftypM4A");
                    } else {
                        cb(file.slice(file.size - 1 - 128, file.size));
                    }
                };
                id3v2_reader.readAsBinaryString(file.slice(0, 28));
            };
            check_id3v2(file, function(result) {
                reader.readAsBinaryString(result);
            });
        };
    };
})(this);
/*
 * JavaScript ID3 Tag Reader 0.1.2
 * Copyright (c) 2008 Jacob Seidelin, cupboy@gmail.com, http://blog.nihilogic.dk/
 * MIT License [http://www.opensource.org/licenses/mit-license.php]
 * 
 * Extended by António Afonso (antonio.afonso@opera.com), Opera Software ASA
 * Modified by António Afonso <antonio.afonso gmail.com>
 */

(function(ns) {
    var ID3 = ns.ID3 = {};

    var _files = {};
    // location of the format identifier
    var _formatIDRange = [0, 11];

    /**
     * Finds out the tag format of this data and returns the appropriate
     * reader.
     */
    function getTagReader(data) {
        // FIXME: improve this detection according to the spec
        return data.getStringAt(4, 7) == "ftypM4A" ? ID4 :
                (data.getStringAt(0, 3) == "ID3" ? ID3v2 : ID3v1);
    }

    function readTags(reader, data, url, tags) {
        var tagsFound = reader.readTagsFromData(data, tags);
        //console.log("Downloaded data: " + data.getDownloadedBytesCount() + "bytes");
        var tags = _files[url] || {};
        for (var tag in tagsFound)
            if (tagsFound.hasOwnProperty(tag)) {
                tags[tag] = tagsFound[tag];
            }
        _files[url] = tags;
    }

    ID3.clearTags = function(url) {
        delete _files[url];
    };

    ID3.clearAll = function() {
        _files = {};
    };

    /**
     * @param {string} url The location of the sound file to read.
     * @param {function()} cb The callback function to be invoked when all tags have been read.
     * @param {{tags: Array.<string>, dataReader: function(string, function(BinaryReader))}} options The set of options that can specify the tags to be read and the dataReader to use in order to read the file located at url.
     */

    ID3.loadTags = function(url, cb, options) {
        //BufferedBinaryFileReader
        options = options || {};
        var dataReader = options["dataReader"] || BufferedBinaryAjax;
        dataReader(url, function(data) {
            if (typeof (data) === "string" && options["file"]) {
                dataReader = BufferedBinaryFileReader;
                dataReader(options["file"], function(data) {
                    data.loadRange(_formatIDRange, function() {
                        var reader = getTagReader(data);
                        reader.loadData(data, function() {
                            readTags(reader, data, url, options["tags"]);
                            if (cb)
                                cb();
                        });
                    });
                });
            } else {
                // preload the format identifier
                data.loadRange(_formatIDRange, function() {
                    var reader = getTagReader(data);
                    reader.loadData(data, function() {
                        readTags(reader, data, url, options["tags"]);
                        if (cb)
                            cb();
                    });
                });
            }
        });
    };
    /*
     ID3.loadTags = function(url, cb, options) {
     options = options || {};
     var dataReader = (options["file"]) ? BufferedBinaryFileReader : (options["dataReader"] || BufferedBinaryAjax);
     
     dataReader(options["file"] || url, function(data) {
     // preload the format identifier
     data.loadRange(_formatIDRange, function() {
     var reader = getTagReader(data);
     reader.loadData(data, function() {
     readTags(reader, data, url, options["tags"]);
     if (cb) {
     cb();
     }
     });
     });
     });
     };
     */
    ID3.getAllTags = function(url) {
        if (!_files[url])
            return null;

        var tags = {};
        for (var a in _files[url]) {
            if (_files[url].hasOwnProperty(a))
                tags[a] = _files[url][a];
        }
        return tags;
    };

    ID3.getTag = function(url, tag) {
        if (!_files[url])
            return null;

        return _files[url][tag];
    };

    // Export functions for closure compiler
    ns["ID3"] = ns.ID3;
    ID3["loadTags"] = ID3.loadTags;
    ID3["getAllTags"] = ID3.getAllTags;
    ID3["getTag"] = ID3.getTag;
    ID3["clearTags"] = ID3.clearTags;
    ID3["clearAll"] = ID3.clearAll;
})(this);
/*
 * JavaScript ID3 Tag Reader 0.1.2
 * Copyright (c) 2008 Jacob Seidelin, cupboy@gmail.com, http://blog.nihilogic.dk/
 * MIT License [http://www.opensource.org/licenses/mit-license.php]
 * 
 * Extended by António Afonso (antonio.afonso@opera.com), Opera Software ASA
 * Modified by António Afonso (antonio.afonso gmail.com)
 */

(function(ns) {
    var ID3v1 = ns.ID3v1 = {};
    var genres = [
        "Blues", "Classic Rock", "Country", "Dance", "Disco", "Funk", "Grunge",
        "Hip-Hop", "Jazz", "Metal", "New Age", "Oldies", "Other", "Pop", "R&B",
        "Rap", "Reggae", "Rock", "Techno", "Industrial", "Alternative", "Ska",
        "Death Metal", "Pranks", "Soundtrack", "Euro-Techno", "Ambient",
        "Trip-Hop", "Vocal", "Jazz+Funk", "Fusion", "Trance", "Classical",
        "Instrumental", "Acid", "House", "Game", "Sound Clip", "Gospel",
        "Noise", "AlternRock", "Bass", "Soul", "Punk", "Space", "Meditative",
        "Instrumental Pop", "Instrumental Rock", "Ethnic", "Gothic",
        "Darkwave", "Techno-Industrial", "Electronic", "Pop-Folk",
        "Eurodance", "Dream", "Southern Rock", "Comedy", "Cult", "Gangsta",
        "Top 40", "Christian Rap", "Pop/Funk", "Jungle", "Native American",
        "Cabaret", "New Wave", "Psychadelic", "Rave", "Showtunes", "Trailer",
        "Lo-Fi", "Tribal", "Acid Punk", "Acid Jazz", "Polka", "Retro",
        "Musical", "Rock & Roll", "Hard Rock", "Folk", "Folk-Rock",
        "National Folk", "Swing", "Fast Fusion", "Bebob", "Latin", "Revival",
        "Celtic", "Bluegrass", "Avantgarde", "Gothic Rock", "Progressive Rock",
        "Psychedelic Rock", "Symphonic Rock", "Slow Rock", "Big Band",
        "Chorus", "Easy Listening", "Acoustic", "Humour", "Speech", "Chanson",
        "Opera", "Chamber Music", "Sonata", "Symphony", "Booty Bass", "Primus",
        "Porn Groove", "Satire", "Slow Jam", "Club", "Tango", "Samba",
        "Folklore", "Ballad", "Power Ballad", "Rhythmic Soul", "Freestyle",
        "Duet", "Punk Rock", "Drum Solo", "Acapella", "Euro-House", "Dance Hall"
    ];

    ID3v1.loadData = function(data, callback) {
        var length = data.getLength();
        data.loadRange([length - 128 - 1, length], callback);
    }

    ID3v1.readTagsFromData = function(data) {
        var offset = data.getLength() - 128;
        var header = data.getStringAt(offset, 3);
        if (header == "TAG") {
            var title = data.getStringAt(offset + 3, 30).replace(/\0/g, "");
            var artist = data.getStringAt(offset + 33, 30).replace(/\0/g, "");
            var album = data.getStringAt(offset + 63, 30).replace(/\0/g, "");
            var year = data.getStringAt(offset + 93, 4).replace(/\0/g, "");

            var trackFlag = data.getByteAt(offset + 97 + 28);
            if (trackFlag == 0) {
                var comment = data.getStringAt(offset + 97, 28).replace(/\0/g, "");
                var track = data.getByteAt(offset + 97 + 29);
            } else {
                var comment = "";
                var track = 0;
            }

            var genreIdx = data.getByteAt(offset + 97 + 30);
            if (genreIdx < 255) {
                var genre = genres[genreIdx];
            } else {
                var genre = "";
            }

            return {
                "version": '1.1',
                "title": title,
                "artist": artist,
                "album": album,
                "year": year,
                "comment": comment,
                "track": track,
                "genre": genre
            }
        } else {
            return {};
        }
    };

    // Export functions for closure compiler
    ns["ID3v1"] = ns.ID3v1;
})(this);
/*
 * Copyright (c) 2009 Opera Software ASA, António Afonso (antonio.afonso@opera.com)
 * Modified by António Afonso <antonio.afonso gmail.com>
 */

(function(ns) {
    var ID3v2 = ns.ID3v2 = {};

    ID3v2.readFrameData = {};
    ID3v2.frames = {
        // v2.2
        "BUF": "Recommended buffer size",
        "CNT": "Play counter",
        "COM": "Comments",
        "CRA": "Audio encryption",
        "CRM": "Encrypted meta frame",
        "ETC": "Event timing codes",
        "EQU": "Equalization",
        "GEO": "General encapsulated object",
        "IPL": "Involved people list",
        "LNK": "Linked information",
        "MCI": "Music CD Identifier",
        "MLL": "MPEG location lookup table",
        "PIC": "Attached picture",
        "POP": "Popularimeter",
        "REV": "Reverb",
        "RVA": "Relative volume adjustment",
        "SLT": "Synchronized lyric/text",
        "STC": "Synced tempo codes",
        "TAL": "Album/Movie/Show title",
        "TBP": "BPM (Beats Per Minute)",
        "TCM": "Composer",
        "TCO": "Content type",
        "TCR": "Copyright message",
        "TDA": "Date",
        "TDY": "Playlist delay",
        "TEN": "Encoded by",
        "TFT": "File type",
        "TIM": "Time",
        "TKE": "Initial key",
        "TLA": "Language(s)",
        "TLE": "Length",
        "TMT": "Media type",
        "TOA": "Original artist(s)/performer(s)",
        "TOF": "Original filename",
        "TOL": "Original Lyricist(s)/text writer(s)",
        "TOR": "Original release year",
        "TOT": "Original album/Movie/Show title",
        "TP1": "Lead artist(s)/Lead performer(s)/Soloist(s)/Performing group",
        "TP2": "Band/Orchestra/Accompaniment",
        "TP3": "Conductor/Performer refinement",
        "TP4": "Interpreted, remixed, or otherwise modified by",
        "TPA": "Part of a set",
        "TPB": "Publisher",
        "TRC": "ISRC (International Standard Recording Code)",
        "TRD": "Recording dates",
        "TRK": "Track number/Position in set",
        "TSI": "Size",
        "TSS": "Software/hardware and settings used for encoding",
        "TT1": "Content group description",
        "TT2": "Title/Songname/Content description",
        "TT3": "Subtitle/Description refinement",
        "TXT": "Lyricist/text writer",
        "TXX": "User defined text information frame",
        "TYE": "Year",
        "UFI": "Unique file identifier",
        "ULT": "Unsychronized lyric/text transcription",
        "WAF": "Official audio file webpage",
        "WAR": "Official artist/performer webpage",
        "WAS": "Official audio source webpage",
        "WCM": "Commercial information",
        "WCP": "Copyright/Legal information",
        "WPB": "Publishers official webpage",
        "WXX": "User defined URL link frame",
        // v2.3
        "AENC": "Audio encryption",
        "APIC": "Attached picture",
        "COMM": "Comments",
        "COMR": "Commercial frame",
        "ENCR": "Encryption method registration",
        "EQUA": "Equalization",
        "ETCO": "Event timing codes",
        "GEOB": "General encapsulated object",
        "GRID": "Group identification registration",
        "IPLS": "Involved people list",
        "LINK": "Linked information",
        "MCDI": "Music CD identifier",
        "MLLT": "MPEG location lookup table",
        "OWNE": "Ownership frame",
        "PRIV": "Private frame",
        "PCNT": "Play counter",
        "POPM": "Popularimeter",
        "POSS": "Position synchronisation frame",
        "RBUF": "Recommended buffer size",
        "RVAD": "Relative volume adjustment",
        "RVRB": "Reverb",
        "SYLT": "Synchronized lyric/text",
        "SYTC": "Synchronized tempo codes",
        "TALB": "Album/Movie/Show title",
        "TBPM": "BPM (beats per minute)",
        "TCOM": "Composer",
        "TCON": "Content type",
        "TCOP": "Copyright message",
        "TDAT": "Date",
        "TDLY": "Playlist delay",
        "TENC": "Encoded by",
        "TEXT": "Lyricist/Text writer",
        "TFLT": "File type",
        "TIME": "Time",
        "TIT1": "Content group description",
        "TIT2": "Title/songname/content description",
        "TIT3": "Subtitle/Description refinement",
        "TKEY": "Initial key",
        "TLAN": "Language(s)",
        "TLEN": "Length",
        "TMED": "Media type",
        "TOAL": "Original album/movie/show title",
        "TOFN": "Original filename",
        "TOLY": "Original lyricist(s)/text writer(s)",
        "TOPE": "Original artist(s)/performer(s)",
        "TORY": "Original release year",
        "TOWN": "File owner/licensee",
        "TPE1": "Lead performer(s)/Soloist(s)",
        "TPE2": "Band/orchestra/accompaniment",
        "TPE3": "Conductor/performer refinement",
        "TPE4": "Interpreted, remixed, or otherwise modified by",
        "TPOS": "Part of a set",
        "TPUB": "Publisher",
        "TRCK": "Track number/Position in set",
        "TRDA": "Recording dates",
        "TRSN": "Internet radio station name",
        "TRSO": "Internet radio station owner",
        "TSIZ": "Size",
        "TSRC": "ISRC (international standard recording code)",
        "TSSE": "Software/Hardware and settings used for encoding",
        "TYER": "Year",
        "TXXX": "User defined text information frame",
        "UFID": "Unique file identifier",
        "USER": "Terms of use",
        "USLT": "Unsychronized lyric/text transcription",
        "WCOM": "Commercial information",
        "WCOP": "Copyright/Legal information",
        "WOAF": "Official audio file webpage",
        "WOAR": "Official artist/performer webpage",
        "WOAS": "Official audio source webpage",
        "WORS": "Official internet radio station homepage",
        "WPAY": "Payment",
        "WPUB": "Publishers official webpage",
        "WXXX": "User defined URL link frame"
    };

    var _shortcuts = {
        "title": ["TIT2", "TT2"],
        "artist": ["TPE1", "TP1"],
        "album": ["TALB", "TAL"],
        "year": ["TYER", "TYE"],
        "comment": ["COMM", "COM"],
        "track": ["TRCK", "TRK"],
        "genre": ["TCON", "TCO"],
        "picture": ["APIC", "PIC"],
        "lyrics": ["USLT", "ULT"]
    };
    var _defaultShortcuts = ["title", "artist", "album", "track"];

    function getTagsFromShortcuts(shortcuts) {
        var tags = [];
        for (var i = 0, shortcut; shortcut = shortcuts[i]; i++) {
            tags = tags.concat(_shortcuts[shortcut] || [shortcut]);
        }
        return tags;
    }

    // The ID3v2 tag/frame size is encoded with four bytes where the most significant bit (bit 7) is set to zero in every byte, making a total of 28 bits. The zeroed bits are ignored, so a 257 bytes long tag is represented as $00 00 02 01.
    function readSynchsafeInteger32At(offset, data) {
        var size1 = data.getByteAt(offset);
        var size2 = data.getByteAt(offset + 1);
        var size3 = data.getByteAt(offset + 2);
        var size4 = data.getByteAt(offset + 3);
        // 0x7f = 0b01111111
        var size = size4 & 0x7f
                | ((size3 & 0x7f) << 7)
                | ((size2 & 0x7f) << 14)
                | ((size1 & 0x7f) << 21);
        return size;
    }
    ID3v2.readSynchsafeInteger32At = readSynchsafeInteger32At;

    function readFrameFlags(data, offset)
    {
        var flags =
                {
                    message:
                            {
                                tag_alter_preservation: data.isBitSetAt(offset, 6),
                                file_alter_preservation: data.isBitSetAt(offset, 5),
                                read_only: data.isBitSetAt(offset, 4)
                            },
                    format:
                            {
                                grouping_identity: data.isBitSetAt(offset + 1, 7),
                                compression: data.isBitSetAt(offset + 1, 3),
                                encription: data.isBitSetAt(offset + 1, 2),
                                unsynchronisation: data.isBitSetAt(offset + 1, 1),
                                data_length_indicator: data.isBitSetAt(offset + 1, 0)
                            }
                };

        return flags;
    }

    /** All the frames consists of a frame header followed by one or more fields containing the actual information.
     * The frame ID made out of the characters capital A-Z and 0-9. Identifiers beginning with "X", "Y" and "Z" are for experimental use and free for everyone to use, without the need to set the experimental bit in the tag header. Have in mind that someone else might have used the same identifier as you. All other identifiers are either used or reserved for future use.
     * The frame ID is followed by a size descriptor, making a total header size of ten bytes in every frame. The size is calculated as frame size excluding frame header (frame size - 10).
     */
    function readFrames(offset, end, data, id3header, tags)
    {
        var frames = {};
        var frameDataSize;
        var major = id3header["major"];

        tags = getTagsFromShortcuts(tags || _defaultShortcuts);

        while (offset < end) {
            var readFrameFunc = null;
            var frameData = data;
            var frameDataOffset = offset;
            var flags = null;

            switch (major) {
                case 2:
                    var frameID = frameData.getStringAt(frameDataOffset, 3);
                    var frameSize = frameData.getInteger24At(frameDataOffset + 3, true);
                    var frameHeaderSize = 6;
                    break;

                case 3:
                    var frameID = frameData.getStringAt(frameDataOffset, 4);
                    var frameSize = frameData.getLongAt(frameDataOffset + 4, true);
                    var frameHeaderSize = 10;
                    break;

                case 4:
                    var frameID = frameData.getStringAt(frameDataOffset, 4);
                    var frameSize = readSynchsafeInteger32At(frameDataOffset + 4, frameData);
                    var frameHeaderSize = 10;
                    break;
            }
            // if last frame GTFO
            if (frameID == "") {
                break;
            }

            // advance data offset to the next frame data
            offset += frameHeaderSize + frameSize;
            // skip unwanted tags
            if (tags.indexOf(frameID) < 0) {
                continue;
            }

            // read frame message and format flags
            if (major > 2)
            {
                flags = readFrameFlags(frameData, frameDataOffset + 8);
            }

            frameDataOffset += frameHeaderSize;

            // the first 4 bytes are the real data size 
            // (after unsynchronisation && encryption)
            if (flags && flags.format.data_length_indicator)
            {
                frameDataSize = readSynchsafeInteger32At(frameDataOffset, frameData);
                frameDataOffset += 4;
                frameSize -= 4;
            }

            // TODO: support unsynchronisation
            if (flags && flags.format.unsynchronisation)
            {
                //frameData = removeUnsynchronisation(frameData, frameSize);
                continue;
            }

            // find frame parsing function
            if (frameID in ID3v2.readFrameData) {
                readFrameFunc = ID3v2.readFrameData[frameID];
            } else if (frameID[0] == "T") {
                readFrameFunc = ID3v2.readFrameData["T*"];
            }

            var parsedData = readFrameFunc ? readFrameFunc(frameDataOffset, frameSize, frameData, flags) : undefined;
            var desc = frameID in ID3v2.frames ? ID3v2.frames[frameID] : 'Unknown';

            var frame = {
                id: frameID,
                size: frameSize,
                description: desc,
                data: parsedData
            };

            if (frameID in frames) {
                if (frames[frameID].id) {
                    frames[frameID] = [frames[frameID]];
                }
                frames[frameID].push(frame);
            } else {
                frames[frameID] = frame;
            }
        }

        return frames;
    }

    //function removeUnsynchronisation(data, size)
    //{
    //    return data;
    //}

    function getFrameData(frames, ids) {
        if (typeof ids == 'string') {
            ids = [ids];
        }

        for (var i = 0, id; id = ids[i]; i++) {
            if (id in frames) {
                return frames[id].data;
            }
        }
    }

    ID3v2.loadData = function(data, callback) {
        data.loadRange([6, 9], function() {
            data.loadRange([0, readSynchsafeInteger32At(6, data)], callback);
        });
    };

    // http://www.id3.org/id3v2.3.0
    ID3v2.readTagsFromData = function(data, tags) {
        var offset = 0;
        var major = data.getByteAt(offset + 3);
        if (major > 4) {
            return {version: '>2.4'};
        }
        var revision = data.getByteAt(offset + 4);
        var unsynch = data.isBitSetAt(offset + 5, 7);
        var xheader = data.isBitSetAt(offset + 5, 6);
        var xindicator = data.isBitSetAt(offset + 5, 5);
        var size = readSynchsafeInteger32At(offset + 6, data);
        offset += 10;

        if (xheader) {
            var xheadersize = data.getLongAt(offset, true);
            // The 'Extended header size', currently 6 or 10 bytes, excludes itself.
            offset += xheadersize + 4;
        }

        var id3 = {
            "version": '2.' + major + '.' + revision,
            "major": major,
            "revision": revision,
            "flags": {
                "unsynchronisation": unsynch,
                "extended_header": xheader,
                "experimental_indicator": xindicator
            },
            "size": size
        };
        var frames = unsynch ? {} : readFrames(offset, size - 10, data, id3, tags);
        // create shortcuts for most common data
        for (var name in _shortcuts)
            if (_shortcuts.hasOwnProperty(name)) {
                var data = getFrameData(frames, _shortcuts[name]);
                if (data)
                    id3[name] = data;
            }

        for (var frame in frames) {
            if (frames.hasOwnProperty(frame)) {
                id3[frame] = frames[frame];
            }
        }

        return id3;
    };

    // Export functions for closure compiler
    ns["ID3v2"] = ID3v2;
})(this);
/*
 * Copyright (c) 2009 Opera Software ASA, António Afonso (antonio.afonso@opera.com)
 * Modified by António Afonso <antonio.afonso gmail.com>
 */
(function() {
    var pictureType = [
        "32x32 pixels 'file icon' (PNG only)",
        "Other file icon",
        "Cover (front)",
        "Cover (back)",
        "Leaflet page",
        "Media (e.g. lable side of CD)",
        "Lead artist/lead performer/soloist",
        "Artist/performer",
        "Conductor",
        "Band/Orchestra",
        "Composer",
        "Lyricist/text writer",
        "Recording Location",
        "During recording",
        "During performance",
        "Movie/video screen capture",
        "A bright coloured fish",
        "Illustration",
        "Band/artist logotype",
        "Publisher/Studio logotype"
    ];

    function getTextEncoding(bite) {
        var charset;
        switch (bite)
        {
            case 0x00:
                charset = 'iso-8859-1';
                break;

            case 0x01:
                charset = 'utf-16';
                break;

            case 0x02:
                charset = 'utf-16be';
                break;

            case 0x03:
                charset = 'utf-8';
                break;
        }

        return charset;
    }

    function getTime(duration)
    {
        var duration = duration / 1000,
                seconds = Math.floor(duration) % 60,
                minutes = Math.floor(duration / 60) % 60,
                hours = Math.floor(duration / 3600);

        return {
            seconds: seconds,
            minutes: minutes,
            hours: hours
        };
    }

    function formatTime(time)
    {
        var seconds = time.seconds < 10 ? '0' + time.seconds : time.seconds;
        var minutes = (time.hours > 0 && time.minutes < 10) ? '0' + time.minutes : time.minutes;

        return (time.hours > 0 ? time.hours + ':' : '') + minutes + ':' + seconds;
    }

    ID3v2.readFrameData['APIC'] = function readPictureFrame(offset, length, data, flags, v) {
        v = v || '3';

        var start = offset;
        var charset = getTextEncoding(data.getByteAt(offset));
        switch (v) {
            case '2':
                var format = data.getStringAt(offset + 1, 3);
                offset += 4;
                break;

            case '3':
            case '4':
                var format = data.getStringWithCharsetAt(offset + 1, length - (offset - start), charset);
                offset += 1 + format.bytesReadCount;
                break;
        }
        var bite = data.getByteAt(offset, 1);
        var type = pictureType[bite];
        var desc = data.getStringWithCharsetAt(offset + 1, length - (offset - start), charset);

        var serach_image = function(data) {
            var index = data.indexOf('JFIF');
            var type = "jpeg";
            var pos = 6;
            if (index === -1) {
                index = data.indexOf('PNG');
                type = "png";
                pos = 1;
            }
            if (index !== -1) {
                return [data.substr(index - pos), "image/" + type];
            } else {
                return undefined;
            }
        };
        var image = serach_image(data.getStringAt(offset, (start + length) - offset));
        if (image) {
            format = image[1];
            image = image[0];
        }

        offset += 1 + desc.bytesReadCount;

        return {
            "format": format.toString(),
            "type": type,
            "description": desc.toString(),
            "data": image || data.getStringAt(offset, (start + length) - offset)
        };
    };

    ID3v2.readFrameData['COMM'] = function readCommentsFrame(offset, length, data) {
        var start = offset;
        var charset = getTextEncoding(data.getByteAt(offset));
        var language = data.getStringAt(offset + 1, 3);
        var shortdesc = data.getStringWithCharsetAt(offset + 4, length - 4, charset);

        offset += 4 + shortdesc.bytesReadCount;
        var text = data.getStringWithCharsetAt(offset, (start + length) - offset, charset);

        return {
            language: language,
            short_description: shortdesc.toString(),
            text: text.toString()
        };
    };

    ID3v2.readFrameData['COM'] = ID3v2.readFrameData['COMM'];

    ID3v2.readFrameData['PIC'] = function(offset, length, data, flags) {
        return ID3v2.readFrameData['APIC'](offset, length, data, flags, '2');
    };

    ID3v2.readFrameData['PCNT'] = function readCounterFrame(offset, length, data) {
        // FIXME: implement the rest of the spec
        return data.getInteger32At(offset);
    };

    ID3v2.readFrameData['CNT'] = ID3v2.readFrameData['PCNT'];

    ID3v2.readFrameData['T*'] = function readTextFrame(offset, length, data) {
        var charset = getTextEncoding(data.getByteAt(offset));

        return data.getStringWithCharsetAt(offset + 1, length - 1, charset).toString();
    };

    ID3v2.readFrameData['TCON'] = function readGenreFrame(offset, length, data) {
        var text = ID3v2.readFrameData['T*'].apply(this, arguments);
        return text.replace(/^\(\d+\)/, '');
    };

    ID3v2.readFrameData['TCO'] = ID3v2.readFrameData['TCON'];

    //ID3v2.readFrameData['TLEN'] = function readLengthFrame(offset, length, data) {
    //    var text = ID3v2.readFrameData['T*'].apply( this, arguments );
    //    
    //    return {
    //        text : text,
    //        parsed : formatTime( getTime(parseInt(text)) )
    //    };
    //};

    ID3v2.readFrameData['USLT'] = function readLyricsFrame(offset, length, data) {
        var start = offset;
        var charset = getTextEncoding(data.getByteAt(offset));
        var language = data.getStringAt(offset + 1, 3);
        var descriptor = data.getStringWithCharsetAt(offset + 4, length - 4, charset);

        offset += 4 + descriptor.bytesReadCount;
        var lyrics = data.getStringWithCharsetAt(offset, (start + length) - offset, charset);

        return {
            language: language,
            descriptor: descriptor.toString(),
            lyrics: lyrics.toString()
        };
    };

    ID3v2.readFrameData['ULT'] = ID3v2.readFrameData['USLT'];
})();
/*
 * Support for iTunes-style m4a tags
 * See:
 *   http://atomicparsley.sourceforge.net/mpeg-4files.html
 *   http://developer.apple.com/mac/library/documentation/QuickTime/QTFF/Metadata/Metadata.html
 * Authored by Joshua Kifer <joshua.kifer gmail.com>
 * MIT License [http://www.opensource.org/licenses/mit-license.php]
 */

(function(ns) {
    var ID4 = ns.ID4 = {};

    ID4.types = {
        '0': 'uint8',
        '1': 'text',
        '13': 'jpeg',
        '14': 'png',
        '21': 'uint8'
    };
    ID4.atom = {
        '©alb': ['album'],
        '©art': ['artist'],
        '©ART': ['artist'],
        'aART': ['artist'],
        '©day': ['year'],
        '©nam': ['title'],
        '©gen': ['genre'],
        'trkn': ['track'],
        '©wrt': ['composer'],
        '©too': ['encoder'],
        'cprt': ['copyright'],
        'covr': ['picture'],
        '©grp': ['grouping'],
        'keyw': ['keyword'],
        '©lyr': ['lyrics'],
        '©cmt': ['comment'],
        'tmpo': ['tempo'],
        'cpil': ['compilation'],
        'disk': ['disc']
    };

    ID4.loadData = function(data, callback) {
        // load the header of the first block
        data.loadRange([0, 8], function() {
            loadAtom(data, 0, data.getLength(), callback);
        });
    };

    /**
     * Make sure that the [offset, offset+7] bytes (the block header) are
     * already loaded before calling this function.
     */
    function loadAtom(data, offset, length, callback) {
        // 8 is the size of the atomSize and atomName fields.
        // When reading the current block we always read 8 more bytes in order
        // to also read the header of the next block.
        var atomSize = data.getLongAt(offset, true);
        if (isNaN(atomSize) || atomSize === 0)
            return callback();
        var atomName = data.getStringAt(offset + 4, 4);

        // Container atoms
        if (['moov', 'udta', 'meta', 'ilst'].indexOf(atomName) > -1)
        {
            if (atomName == 'meta')
                offset += 4; // next_item_id (uint32)
            data.loadRange([offset + 8, offset + 8 + 8], function() {
                loadAtom(data, offset + 8, atomSize - 8, callback);
            });
        } else {
            // Value atoms
            var readAtom = atomName in ID4.atom;
            data.loadRange([offset + (readAtom ? 0 : atomSize), offset + atomSize + 8], function() {
                loadAtom(data, offset + atomSize, length, callback);
            });
        }
    }
    ;

    ID4.readTagsFromData = function(data) {
        var tag = {};
        readAtom(tag, data, 0, data.getLength());
        return tag;
    };

    function readAtom(tag, data, offset, length, indent)
    {
        indent = indent === undefined ? "" : indent + "  ";
        var seek = offset;
        while (seek < offset + length)
        {
            var atomSize = data.getLongAt(seek, true);
            if (isNaN(atomSize) || atomSize == 0)
                return;
            var atomName = data.getStringAt(seek + 4, 4);
            // Container atoms
            if (['moov', 'udta', 'meta', 'ilst'].indexOf(atomName) > -1)
            {
                if (atomName == 'meta')
                    seek += 4; // next_item_id (uint32)
                readAtom(tag, data, seek + 8, atomSize - 8, indent);
                return;
            }
            // Value atoms
            if (ID4.atom[atomName])
            {
                var klass = data.getInteger24At(seek + 16 + 1, true);
                var atom = ID4.atom[atomName];
                var type = ID4.types[klass];
                if (atomName == 'trkn')
                {
                    tag[atom[0]] = data.getByteAt(seek + 16 + 11);
                    tag['count'] = data.getByteAt(seek + 16 + 13);
                }
                else
                {
                    // 16: name + size + "data" + size (4 bytes each)
                    // 4: atom version (1 byte) + atom flags (3 bytes)
                    // 4: NULL (usually locale indicator)
                    var dataStart = seek + 16 + 4 + 4;
                    var dataEnd = atomSize - 16 - 4 - 4;
                    var atomData;
                    switch (type) {
                        case 'text':
                            atomData = data.getStringWithCharsetAt(dataStart, dataEnd, "UTF-8");
                            break;

                        case 'uint8':
                            atomData = data.getShortAt(dataStart);
                            break;

                        case 'jpeg':
                        case 'png':
                            atomData = {
                                format: "image/" + type,
                                data: data.getStringAt(dataStart, dataEnd)
                            };
                            break;
                    }

                    if (atom[0] === "comment") {
                        tag[atom[0]] = {
                            "text": atomData
                        };
                    } else {
                        tag[atom[0]] = atomData;
                    }
                }
            }
            seek += atomSize;
        }
    }

    // Export functions for closure compiler
    ns["ID4"] = ns.ID4;
})(this);