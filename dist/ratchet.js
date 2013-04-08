/**
 * ==================================
 * Ratchet v1.0.1
 * Licensed under The MIT License
 * http://opensource.org/licenses/MIT
 * ==================================
 */

/* ----------------------------------
 * lunr v0.2.2
 * http://lunrjs.com - A bit like Solr, but much smaller and not as bright
 * Copyright (C) 2013 Oliver Nightingale
 * Licensed under The MIT License
 * http://opensource.org/licenses/MIT
 * ---------------------------------- */
 
var lunr = function (config) {
  var idx = new lunr.Index

  idx.pipeline.add(lunr.stopWordFilter, lunr.stemmer)

  if (config) config.call(idx, idx)

  return idx
}

lunr.version = "0.2.2"

if (typeof module !== 'undefined') {
  module.exports = lunr
}
/*!
 * lunr.tokenizer
 * Copyright (C) 2013 Oliver Nightingale
 */

/**
 * A function for splitting a string into tokens ready to be inserted into
 * the search index.
 *
 * @module
 * @param {String} str The string to convert into tokens
 * @returns {Array}
 */
lunr.tokenizer = function (str) {
  if (Array.isArray(str)) return str

  var whiteSpaceSplitRegex = /\s+/

  return str.split(whiteSpaceSplitRegex).map(function (token) {
    return token.replace(/^\W+/, '').replace(/\W+$/, '').toLowerCase()
  })
}
/*!
 * lunr.Pipeline
 * Copyright (C) 2013 Oliver Nightingale
 */

/**
 * lunr.Pipelines maintain an ordered list of functions to be applied to all
 * tokens in documents entering the search index and queries being ran against
 * the index.
 *
 * An instance of lunr.Index created with the lunr shortcut will contain a
 * pipeline with a stop word filter and an English language stemmer. Extra
 * functions can be added before or after either of these functions or these
 * default functions can be removed.
 *
 * When run the pipeline will call each function in turn, passing a token, the
 * index of that token in the original list of all tokens and finally a list of
 * all the original tokens.
 *
 * The output of functions in the pipeline will be passed to the next function
 * in the pipeline. To exclude a token from entering the index the function
 * should return undefined, the rest of the pipeline will not be called with
 * this token.
 *
 * @constructor
 */
lunr.Pipeline = function () {
  this._stack = []
}

/**
 * Adds new functions to the end of the pipeline.
 *
 * @param {Function} functions Any number of functions to add to the pipeline.
 * @memberOf Pipeline
 */
lunr.Pipeline.prototype.add = function () {
  var fns = Array.prototype.slice.call(arguments)
  Array.prototype.push.apply(this._stack, fns)
}

/**
 * Adds a single function after a function that already exists in the
 * pipeline.
 *
 * @param {Function} existingFn A function that already exists in the pipeline.
 * @param {Function} newFn The new function to add to the pipeline.
 * @memberOf Pipeline
 */
lunr.Pipeline.prototype.after = function (existingFn, newFn) {
  var pos = this._stack.indexOf(existingFn) + 1
  this._stack.splice(pos, 0, newFn)
}

/**
 * Adds a single function before a function that already exists in the
 * pipeline.
 *
 * @param {Function} existingFn A function that already exists in the pipeline.
 * @param {Function} newFn The new function to add to the pipeline.
 * @memberOf Pipeline
 */
lunr.Pipeline.prototype.before = function (existingFn, newFn) {
  var pos = this._stack.indexOf(existingFn)
  this._stack.splice(pos, 0, newFn)
}

/**
 * Removes a function from the pipeline.
 *
 * @param {Function} fn The function to remove from the pipeline.
 * @memberOf Pipeline
 */
lunr.Pipeline.prototype.remove = function (fn) {
  var pos = this._stack.indexOf(fn)
  this._stack.splice(pos, 1)
}

/**
 * Runs the current list of functions that make up the pipeline against the
 * passed tokens.
 *
 * @param {Array} tokens The tokens to run through the pipeline.
 * @returns {Array}
 * @memberOf Pipeline
 */
lunr.Pipeline.prototype.run = function (tokens) {
  var out = [],
      tokenLength = tokens.length,
      stackLength = this._stack.length

  for (var i = 0; i < tokenLength; i++) {
    var token = tokens[i]

    for (var j = 0; j < stackLength; j++) {
      token = this._stack[j](token, i, tokens)
      if (token === void 0) break
    };

    if (token !== void 0) out.push(token)
  };

  return out
}

/*!
 * lunr.Vector
 * Copyright (C) 2013 Oliver Nightingale
 */

/**
 * lunr.Vectors wrap arrays and add vector related operations for the array
 * elements.
 *
 * @constructor
 * @param {Array} elements Elements that make up the vector.
 */
lunr.Vector = function (elements) {
  this.elements = elements

  for (var i = 0; i < elements.length; i++) {
    if (!(i in this.elements)) this.elements[i] = 0
  }
}

/**
 * Calculates the magnitude of this vector.
 *
 * @returns {Number}
 * @memberOf Vector
 */
lunr.Vector.prototype.magnitude = function () {
  if (this._magnitude) return this._magnitude

  var sumOfSquares = 0,
      elems = this.elements,
      len = elems.length,
      el

  for (var i = 0; i < len; i++) {
    el = elems[i]
    sumOfSquares += el * el
  };

  return this._magnitude = Math.sqrt(sumOfSquares)
}

/**
 * Calculates the dot product of this vector and another vector.
 *
 * @param {lunr.Vector} otherVector The vector to compute the dot product with.
 * @returns {Number}
 * @memberOf Vector
 */
lunr.Vector.prototype.dot = function (otherVector) {
  var elem1 = this.elements,
      elem2 = otherVector.elements,
      length = elem1.length,
      dotProduct = 0

  for (var i = 0; i < length; i++) {
    dotProduct += elem1[i] * elem2[i]
  };

  return dotProduct
}

/**
 * Calculates the cosine similarity between this vector and another
 * vector.
 *
 * @param {lunr.Vector} otherVector The other vector to calculate the
 * similarity with.
 * @returns {Number}
 * @memberOf Vector
 */
lunr.Vector.prototype.similarity = function (otherVector) {
  return this.dot(otherVector) / (this.magnitude() * otherVector.magnitude())
}

/**
 * Converts this vector back into an array.
 *
 * @returns {Array}
 * @memberOf Vector
 */
lunr.Vector.prototype.toArray = function () {
  return this.elements
}
/*!
 * lunr.SortedSet
 * Copyright (C) 2013 Oliver Nightingale
 */

/**
 * lunr.SortedSets are used to maintain an array of uniq values in a sorted
 * order.
 *
 * @constructor
 */
lunr.SortedSet = function () {
  this.length = 0
  this.elements = []
}

/**
 * Inserts new items into the set in the correct position to maintain the
 * order.
 *
 * @param {Object} The objects to add to this set.
 * @memberOf SortedSet
 */
lunr.SortedSet.prototype.add = function () {
  Array.prototype.slice.call(arguments).forEach(function (element) {
    if (~this.elements.indexOf(element)) return
    this.elements.splice(this.locationFor(element), 0, element)
  }, this)

  this.length = this.elements.length
}

/**
 * Converts this sorted set into an array.
 *
 * @returns {Array}
 * @memberOf SortedSet
 */
lunr.SortedSet.prototype.toArray = function () {
  return this.elements.slice()
}

/**
 * Creates a new array with the results of calling a provided function on every
 * element in this sorted set.
 *
 * Delegates to Array.prototype.map and has the same signature.
 *
 * @param {Function} fn The function that is called on each element of the
 * set.
 * @param {Object} ctx An optional object that can be used as the context
 * for the function fn.
 * @returns {Array}
 * @memberOf SortedSet
 */
lunr.SortedSet.prototype.map = function (fn, ctx) {
  return this.elements.map(fn, ctx)
}

/**
 * Executes a provided function once per sorted set element.
 *
 * Delegates to Array.prototype.forEach and has the same signature.
 *
 * @param {Function} fn The function that is called on each element of the
 * set.
 * @param {Object} ctx An optional object that can be used as the context
 * @memberOf SortedSet
 * for the function fn.
 */
lunr.SortedSet.prototype.forEach = function (fn, ctx) {
  return this.elements.forEach(fn, ctx)
}

/**
 * Returns the first index at which a given element can be found in the
 * sorted set, or -1 if it is not present.
 *
 * Delegates to Array.prototype.indexOf and has the same signature.
 *
 * @param {Object} elem The object to locate in the sorted set.
 * @param {Number} startIndex The index at which to begin the search.
 * @returns {Number}
 * @memberOf SortedSet
 */
lunr.SortedSet.prototype.indexOf = function (elem, startIndex) {
  return this.elements.indexOf(elem, startIndex)
}

/**
 * Returns the position within the sorted set that an element should be
 * inserted at to maintain the current order of the set.
 *
 * This function assumes that the element to search for does not already exist
 * in the sorted set.
 *
 * @param {Object} elem The elem to find the position for in the set
 * @param {Number} start An optional index at which to start searching from
 * within the set.
 * @param {Number} end An optional index at which to stop search from within
 * the set.
 * @returns {Number}
 * @memberOf SortedSet
 */
lunr.SortedSet.prototype.locationFor = function (elem, start, end) {
  var start = start || 0,
      end = end || this.elements.length,
      sectionLength = end - start,
      pivot = start + Math.floor(sectionLength / 2),
      pivotElem = this.elements[pivot]

  if (sectionLength <= 1) {
    if (pivotElem > elem) return pivot
    if (pivotElem < elem) return pivot + 1
  }

  if (pivotElem < elem) return this.locationFor(elem, pivot, end)
  if (pivotElem > elem) return this.locationFor(elem, start, pivot)
}

/**
 * Creates a new lunr.SortedSet that contains the elements in the intersection
 * of this set and the passed set.
 *
 * @param {lunr.SortedSet} otherSet The set to intersect with this set.
 * @returns {lunr.SortedSet}
 * @memberOf SortedSet
 */
lunr.SortedSet.prototype.intersect = function (otherSet) {
  var intersectSet = new lunr.SortedSet,
      i = 0, j = 0,
      a_len = this.length, b_len = otherSet.length,
      a = this.elements, b = otherSet.elements

  while (true) {
    if (i > a_len - 1 || j > b_len - 1) break

    if (a[i] === b[j]) {
      intersectSet.add(a[i])
      i++, j++
      continue
    }

    if (a[i] < b[j]) {
      i++
      continue
    }

    if (a[i] > b[j]) {
      j++
      continue
    }
  };

  return intersectSet
}

/**
 * Makes a copy of this set
 *
 * @returns {lunr.SortedSet}
 * @memberOf SortedSet
 */
lunr.SortedSet.prototype.clone = function () {
  var clone = new lunr.SortedSet

  clone.elements = this.toArray()
  clone.length = clone.elements.length

  return clone
}

/**
 * Creates a new lunr.SortedSet that contains the elements in the union
 * of this set and the passed set.
 *
 * @param {lunr.SortedSet} otherSet The set to union with this set.
 * @returns {lunr.SortedSet}
 * @memberOf SortedSet
 */
lunr.SortedSet.prototype.union = function (otherSet) {
  var longSet, shortSet, unionSet

  if (this.length >= otherSet.length) {
    longSet = this, shortSet = otherSet
  } else {
    longSet = otherSet, shortSet = this
  }

  unionSet = longSet.clone()

  unionSet.add.apply(unionSet, shortSet.toArray())

  return unionSet
}
/*!
 * lunr.Index
 * Copyright (C) 2013 Oliver Nightingale
 */

/**
 * lunr.Index is object that manages a search index.  It contains the indexes
 * and stores all the tokens and document lookups.  It also provides the main
 * user facing API for the library.
 *
 * @constructor
 */
lunr.Index = function () {
  this._fields = []
  this._ref = 'id'
  this.pipeline = new lunr.Pipeline
  this.documentStore = new lunr.Store
  this.tokenStore = new lunr.TokenStore
  this.corpusTokens = new lunr.SortedSet
}

/**
 * Adds a field to the list of fields that will be searchable within documents
 * in the index.
 *
 * An optional boost param can be passed to affect how much tokens in this field
 * rank in search results, by default the boost value is 1.
 *
 * Fields should be added before any documents are added to the index, fields
 * that are added after documents are added to the index will only apply to new
 * documents added to the index.
 *
 * @param {String} fieldName The name of the field within the document that
 * should be indexed
 * @param {Number} boost An optional boost that can be applied to terms in this
 * field.
 * @returns {lunr.Index}
 * @memberOf Index
 */
lunr.Index.prototype.field = function (fieldName, opts) {
  var opts = opts || {},
      field = { name: fieldName, boost: opts.boost || 1 }

  this._fields.push(field)
  return this
}

/**
 * Sets the property used to uniquely identify documents added to the index,
 * by default this property is 'id'.
 *
 * This should only be changed before adding documents to the index, changing
 * the ref property without resetting the index can lead to unexpected results.
 *
 * @param {String} refName The property to use to uniquely identify the
 * documents in the index.
 * @returns {lunr.Index}
 * @memberOf Index
 */
lunr.Index.prototype.ref = function (refName) {
  this._ref = refName
  return this
}

/**
 * Add a document to the index.
 *
 * This is the way new documents enter the index, this function will run the
 * fields from the document through the index's pipeline and then add it to
 * the index, it will then show up in search results.
 *
 * @param {Object} doc The document to add to the index.
 * @memberOf Index
 */
lunr.Index.prototype.add = function (doc) {
  var docTokens = {},
      allDocumentTokens = new lunr.SortedSet,
      docRef = doc[this._ref]

  this._fields.forEach(function (field) {
    var fieldTokens = this.pipeline.run(lunr.tokenizer(doc[field.name]))

    docTokens[field.name] = fieldTokens
    lunr.SortedSet.prototype.add.apply(allDocumentTokens, fieldTokens)
  }, this)

  this.documentStore.set(docRef, allDocumentTokens)
  lunr.SortedSet.prototype.add.apply(this.corpusTokens, allDocumentTokens.toArray())

  for (var i = 0; i < allDocumentTokens.length; i++) {
    var token = allDocumentTokens.elements[i]
    var tf = this._fields.reduce(function (memo, field) {
      var tokenCount = docTokens[field.name].filter(function (t) { return t === token }).length,
          fieldLength = docTokens[field.name].length

      return memo + (tokenCount / fieldLength * field.boost)
    }, 0)

    this.tokenStore.add(token, { ref: docRef, tf: tf })
  };
}

/**
 * Removes a document from the index.
 *
 * To make sure documents no longer show up in search results they can be
 * removed from the index using this method.
 *
 * The document passed only needs to have the same ref property value as the
 * document that was added to the index, they could be completely different
 * objects.
 *
 * @param {Object} doc The document to remove from the index.
 * @memberOf Index
 */
lunr.Index.prototype.remove = function (doc) {
  var docRef = doc[this._ref],
      docTokens = this.documentStore.get(docRef)

  this.documentStore.remove(docRef)

  docTokens.forEach(function (token) {
    this.tokenStore.remove(token, docRef)
  }, this)
}

/**
 * Updates a document in the index.
 *
 * When a document contained within the index gets updated, fields changed,
 * added or removed, to make sure it correctly matched against search queries,
 * it should be updated in the index.
 *
 * This method is just a wrapper around `remove` and `add`
 *
 * @param {Object} doc The document to update in the index.
 * @see Index.prototype.remove
 * @see Index.prototype.add
 * @memberOf Index
 */
lunr.Index.prototype.update = function (doc) {
  this.remove(doc)
  this.add(doc)
}

/**
 * Calculates the inverse document frequency for a token within the index.
 *
 * @param {String} token The token to calculate the idf of.
 * @see Index.prototype.idf
 * @private
 * @memberOf Index
 */
lunr.Index.prototype.idf = function (term) {
  var documentFrequency = Object.keys(this.tokenStore.get(term)).length

  if (documentFrequency === 0) {
    return 1
  } else {
    return 1 + Math.log(this.tokenStore.length / documentFrequency)
  }
}

/**
 * Searches the index using the passed query.
 *
 * Queries should be a string, multiple words are allowed and will lead to an
 * AND based query, e.g. `idx.search('foo bar')` will run a search for
 * documents containing both 'foo' and 'bar'.
 *
 * All query tokens are passed through the same pipeline that document tokens
 * are passed through, so any language processing involved will be run on every
 * query term.
 *
 * Each query term is expanded, so that the term 'he' might be expanded to
 * 'hello' and 'help' if those terms were already included in the index.
 *
 * Matching documents are returned as an array of objects, each object contains
 * the matching document ref, as set for this index, and the similarity score
 * for this document against the query.
 *
 * @param {String} query The query to search the index with.
 * @returns {Object}
 * @see Index.prototype.idf
 * @see Index.prototype.documentVector
 * @memberOf Index
 */
lunr.Index.prototype.search = function (query) {
  var queryTokens = this.pipeline.run(lunr.tokenizer(query)),
      queryArr = new Array (this.corpusTokens.length),
      documentSets = [],
      fieldBoosts = this._fields.reduce(function (memo, f) { return memo + f.boost }, 0)

  if (!queryTokens.some(lunr.TokenStore.prototype.has, this.tokenStore)) return []

  queryTokens
    .forEach(function (token, i, tokens) {
      var tf = 1 / tokens.length * this._fields.length * fieldBoosts,
          self = this

      var set = this.tokenStore.expand(token).reduce(function (memo, key) {
        var pos = self.corpusTokens.indexOf(key),
            idf = self.idf(key),
            exactMatchBoost = (key === token ? 10 : 1),
            set = new lunr.SortedSet

        // calculate the query tf-idf score for this token
        // applying an exactMatchBoost to ensure these rank
        // higher than expanded terms
        if (pos > -1) queryArr[pos] = tf * idf * exactMatchBoost

        // add all the documents that have this key into a set
        Object.keys(self.tokenStore.get(key)).forEach(function (ref) { set.add(ref) })

        return memo.union(set)
      }, new lunr.SortedSet)

      documentSets.push(set)
    }, this)

  var documentSet = documentSets.reduce(function (memo, set) {
    return memo.intersect(set)
  })

  var queryVector = new lunr.Vector (queryArr)

  return documentSet
    .map(function (ref) {
      return { ref: ref, score: queryVector.similarity(this.documentVector(ref)) }
    }, this)
    .sort(function (a, b) {
      return b.score - a.score
    })
}

/**
 * Generates a vector containing all the tokens in the document matching the
 * passed documentRef.
 *
 * The vector contains the tf-idf score for each token contained in the
 * document with the passed documentRef.  The vector will contain an element
 * for every token in the indexes corpus, if the document does not contain that
 * token the element will be 0.
 *
 * @param {Object} documentRef The ref to find the document with.
 * @returns {lunr.Vector}
 * @private
 * @memberOf Index
 */
lunr.Index.prototype.documentVector = function (documentRef) {
  var documentTokens = this.documentStore.get(documentRef),
      documentTokensLength = documentTokens.length,
      documentArr = new Array (this.corpusTokens.length)

  for (var i = 0; i < documentTokensLength; i++) {
    var token = documentTokens.elements[i],
        tf = this.tokenStore.get(token)[documentRef].tf,
        idf = this.idf(token)

    documentArr[this.corpusTokens.indexOf(token)] = tf * idf
  };

  return new lunr.Vector (documentArr)
}
/*!
 * lunr.Store
 * Copyright (C) 2013 Oliver Nightingale
 */

/**
 * lunr.Store is a simple key-value store used for storing sets of tokens for
 * documents stored in index.
 *
 * @constructor
 * @module
 */
lunr.Store = function () {
  this.store = {}
  this.length = 0
}

/**
 * Stores the given tokens in the store against the given id.
 *
 * @param {Object} id The key used to store the tokens against.
 * @param {Object} tokens The tokens to store against the key.
 * @memberOf Store
 */
lunr.Store.prototype.set = function (id, tokens) {
  this.store[id] = tokens
  this.length = Object.keys(this.store).length
}

/**
 * Retrieves the tokens from the store for a given key.
 *
 * @param {Object} id The key to lookup and retrieve from the store.
 * @returns {Object}
 * @memberOf Store
 */
lunr.Store.prototype.get = function (id) {
  return this.store[id]
}

/**
 * Checks whether the store contains a key.
 *
 * @param {Object} id The id to look up in the store.
 * @returns {Boolean}
 * @memberOf Store
 */
lunr.Store.prototype.has = function (id) {
  return id in this.store
}

/**
 * Removes the value for a key in the store.
 *
 * @param {Object} id The id to remove from the store.
 * @memberOf Store
 */
lunr.Store.prototype.remove = function (id) {
  if (!this.has(id)) return

  delete this.store[id]
  this.length--
}

/*!
 * lunr.stemmer
 * Copyright (C) 2013 Oliver Nightingale
 * Includes code from - http://tartarus.org/~martin/PorterStemmer/js.txt
 */

/**
 * lunr.stemmer is an english language stemmer, this is a JavaScript
 * implementation of the PorterStemmer taken from http://tartaurs.org/~martin
 *
 * @module
 * @param {String} str The string to stem
 * @returns {String}
 * @see lunr.Pipeline
 */
lunr.stemmer = (function(){
  var step2list = {
      "ational" : "ate",
      "tional" : "tion",
      "enci" : "ence",
      "anci" : "ance",
      "izer" : "ize",
      "bli" : "ble",
      "alli" : "al",
      "entli" : "ent",
      "eli" : "e",
      "ousli" : "ous",
      "ization" : "ize",
      "ation" : "ate",
      "ator" : "ate",
      "alism" : "al",
      "iveness" : "ive",
      "fulness" : "ful",
      "ousness" : "ous",
      "aliti" : "al",
      "iviti" : "ive",
      "biliti" : "ble",
      "logi" : "log"
    },

    step3list = {
      "icate" : "ic",
      "ative" : "",
      "alize" : "al",
      "iciti" : "ic",
      "ical" : "ic",
      "ful" : "",
      "ness" : ""
    },

    c = "[^aeiou]",          // consonant
    v = "[aeiouy]",          // vowel
    C = c + "[^aeiouy]*",    // consonant sequence
    V = v + "[aeiou]*",      // vowel sequence

    mgr0 = "^(" + C + ")?" + V + C,               // [C]VC... is m>0
    meq1 = "^(" + C + ")?" + V + C + "(" + V + ")?$",  // [C]VC[V] is m=1
    mgr1 = "^(" + C + ")?" + V + C + V + C,       // [C]VCVC... is m>1
    s_v = "^(" + C + ")?" + v;                   // vowel in stem

  return function (w) {
    var   stem,
      suffix,
      firstch,
      re,
      re2,
      re3,
      re4;

    if (w.length < 3) { return w; }

    firstch = w.substr(0,1);
    if (firstch == "y") {
      w = firstch.toUpperCase() + w.substr(1);
    }

    // Step 1a
    re = /^(.+?)(ss|i)es$/;
    re2 = /^(.+?)([^s])s$/;

    if (re.test(w)) { w = w.replace(re,"$1$2"); }
    else if (re2.test(w)) { w = w.replace(re2,"$1$2"); }

    // Step 1b
    re = /^(.+?)eed$/;
    re2 = /^(.+?)(ed|ing)$/;
    if (re.test(w)) {
      var fp = re.exec(w);
      re = new RegExp(mgr0);
      if (re.test(fp[1])) {
        re = /.$/;
        w = w.replace(re,"");
      }
    } else if (re2.test(w)) {
      var fp = re2.exec(w);
      stem = fp[1];
      re2 = new RegExp(s_v);
      if (re2.test(stem)) {
        w = stem;
        re2 = /(at|bl|iz)$/;
        re3 = new RegExp("([^aeiouylsz])\\1$");
        re4 = new RegExp("^" + C + v + "[^aeiouwxy]$");
        if (re2.test(w)) {  w = w + "e"; }
        else if (re3.test(w)) { re = /.$/; w = w.replace(re,""); }
        else if (re4.test(w)) { w = w + "e"; }
      }
    }

    // Step 1c
    re = /^(.+?)y$/;
    if (re.test(w)) {
      var fp = re.exec(w);
      stem = fp[1];
      re = new RegExp(s_v);
      if (re.test(stem)) { w = stem + "i"; }
    }

    // Step 2
    re = /^(.+?)(ational|tional|enci|anci|izer|bli|alli|entli|eli|ousli|ization|ation|ator|alism|iveness|fulness|ousness|aliti|iviti|biliti|logi)$/;
    if (re.test(w)) {
      var fp = re.exec(w);
      stem = fp[1];
      suffix = fp[2];
      re = new RegExp(mgr0);
      if (re.test(stem)) {
        w = stem + step2list[suffix];
      }
    }

    // Step 3
    re = /^(.+?)(icate|ative|alize|iciti|ical|ful|ness)$/;
    if (re.test(w)) {
      var fp = re.exec(w);
      stem = fp[1];
      suffix = fp[2];
      re = new RegExp(mgr0);
      if (re.test(stem)) {
        w = stem + step3list[suffix];
      }
    }

    // Step 4
    re = /^(.+?)(al|ance|ence|er|ic|able|ible|ant|ement|ment|ent|ou|ism|ate|iti|ous|ive|ize)$/;
    re2 = /^(.+?)(s|t)(ion)$/;
    if (re.test(w)) {
      var fp = re.exec(w);
      stem = fp[1];
      re = new RegExp(mgr1);
      if (re.test(stem)) {
        w = stem;
      }
    } else if (re2.test(w)) {
      var fp = re2.exec(w);
      stem = fp[1] + fp[2];
      re2 = new RegExp(mgr1);
      if (re2.test(stem)) {
        w = stem;
      }
    }

    // Step 5
    re = /^(.+?)e$/;
    if (re.test(w)) {
      var fp = re.exec(w);
      stem = fp[1];
      re = new RegExp(mgr1);
      re2 = new RegExp(meq1);
      re3 = new RegExp("^" + C + v + "[^aeiouwxy]$");
      if (re.test(stem) || (re2.test(stem) && !(re3.test(stem)))) {
        w = stem;
      }
    }

    re = /ll$/;
    re2 = new RegExp(mgr1);
    if (re.test(w) && re2.test(w)) {
      re = /.$/;
      w = w.replace(re,"");
    }

    // and turn initial Y back to y

    if (firstch == "y") {
      w = firstch.toLowerCase() + w.substr(1);
    }

    return w;
  }
})();
/*!
 * lunr.stopWordFilter
 * Copyright (C) 2013 Oliver Nightingale
 */

/**
 * lunr.stopWordFilter is an English language stop word list filter, any words
 * contained in the list will not be passed through the filter.
 *
 * This is intended to be used in the Pipeline. If the token does not pass the
 * filter then undefined will be returned.
 *
 * @module
 * @param {String} token The token to pass through the filter
 * @returns {String}
 * @see lunr.Pipeline
 */
lunr.stopWordFilter = function (token) {
  var stopWords = [
    "a",
    "able",
    "about",
    "across",
    "after",
    "all",
    "almost",
    "also",
    "am",
    "among",
    "an",
    "and",
    "any",
    "are",
    "as",
    "at",
    "be",
    "because",
    "been",
    "but",
    "by",
    "can",
    "cannot",
    "could",
    "dear",
    "did",
    "do",
    "does",
    "either",
    "else",
    "ever",
    "every",
    "for",
    "from",
    "get",
    "got",
    "had",
    "has",
    "have",
    "he",
    "her",
    "hers",
    "him",
    "his",
    "how",
    "however",
    "i",
    "if",
    "in",
    "into",
    "is",
    "it",
    "its",
    "just",
    "least",
    "let",
    "like",
    "likely",
    "may",
    "me",
    "might",
    "most",
    "must",
    "my",
    "neither",
    "no",
    "nor",
    "not",
    "of",
    "off",
    "often",
    "on",
    "only",
    "or",
    "other",
    "our",
    "own",
    "rather",
    "said",
    "say",
    "says",
    "she",
    "should",
    "since",
    "so",
    "some",
    "than",
    "that",
    "the",
    "their",
    "them",
    "then",
    "there",
    "these",
    "they",
    "this",
    "tis",
    "to",
    "too",
    "twas",
    "us",
    "wants",
    "was",
    "we",
    "were",
    "what",
    "when",
    "where",
    "which",
    "while",
    "who",
    "whom",
    "why",
    "will",
    "with",
    "would",
    "yet",
    "you",
    "your"
  ]

  if (stopWords.indexOf(token) === -1) return token
}
/*!
 * lunr.stemmer
 * Copyright (C) 2013 Oliver Nightingale
 * Includes code from - http://tartarus.org/~martin/PorterStemmer/js.txt
 */

/**
 * lunr.TokenStore is used for efficient storing and lookup of the reverse
 * index of token to document ref.
 *
 * @constructor
 */
lunr.TokenStore = function () {
  this.root = { docs: {} }
  this.length = 0
}

/**
 * Adds a new token doc pair to the store.
 *
 * By default this function starts at the root of the current store, however
 * it can start at any node of any token store if required.
 *
 * @param {String} token The token to store the doc under
 * @param {Object} doc The doc to store against the token
 * @param {Object} root An optional node at which to start looking for the
 * correct place to enter the doc, by default the root of this lunr.TokenStore
 * is used.
 * @memberOf TokenStore
 */
lunr.TokenStore.prototype.add = function (token, doc, root) {
  var root = root || this.root,
      key = token[0],
      rest = token.slice(1)

  if (!(key in root)) root[key] = {docs: {}}

  if (rest.length === 0) {
    root[key].docs[doc.ref] = doc
    this.length += 1
    return
  } else {
    return this.add(rest, doc, root[key])
  }
}

/**
 * Checks whether this key is contained within this lunr.TokenStore.
 *
 * By default this function starts at the root of the current store, however
 * it can start at any node of any token store if required.
 *
 * @param {String} token The token to check for
 * @param {Object} root An optional node at which to start
 * @memberOf TokenStore
 */
lunr.TokenStore.prototype.has = function (token, root) {
  var root = root || this.root,
      key = token[0],
      rest = token.slice(1)

  if (!(key in root)) return false

  if (rest.length === 0) {
    return true
  } else {
    return this.has(rest, root[key])
  }
}

/**
 * Retrieve a node from the token store for a given token.
 *
 * By default this function starts at the root of the current store, however
 * it can start at any node of any token store if required.
 *
 * @param {String} token The token to get the node for.
 * @param {Object} root An optional node at which to start.
 * @returns {Object}
 * @see TokenStore.prototype.get
 * @memberOf TokenStore
 */
lunr.TokenStore.prototype.getNode = function (token, root) {
  var root = root || this.root,
      key = token[0],
      rest = token.slice(1)

  if (!(key in root)) return {}

  if (rest.length === 0) {
    return root[key]
  } else {
    return this.getNode(rest, root[key])
  }
}

/**
 * Retrieve the documents for a node for the given token.
 *
 * By default this function starts at the root of the current store, however
 * it can start at any node of any token store if required.
 *
 * @param {String} token The token to get the documents for.
 * @param {Object} root An optional node at which to start.
 * @returns {Object}
 * @memberOf TokenStore
 */
lunr.TokenStore.prototype.get = function (token, root) {
  return this.getNode(token, root).docs || {}
}

/**
 * Remove the document identified by ref from the token in the store.
 *
 * By default this function starts at the root of the current store, however
 * it can start at any node of any token store if required.
 *
 * @param {String} token The token to get the documents for.
 * @param {String} ref The ref of the document to remove from this token.
 * @param {Object} root An optional node at which to start.
 * @returns {Object}
 * @memberOf TokenStore
 */
lunr.TokenStore.prototype.remove = function (token, ref, root) {
  var root = root || this.root,
      key = token[0],
      rest = token.slice(1)

  if (!(key in root)) return

  if (rest.length === 0) {
    delete root[key].docs[ref]
  } else {
    return this.remove(rest, ref, root[key])
  }
}

/**
 * Find all the possible suffixes of the passed token using tokens
 * currently in the store.
 *
 * @param {String} token The token to expand.
 * @returns {Array}
 * @memberOf TokenStore
 */
lunr.TokenStore.prototype.expand = function (token, memo) {
  var root = this.getNode(token),
      docs = root.docs || {},
      memo = memo || []

  if (Object.keys(docs).length) memo.push(token)

  Object.keys(root)
    .forEach(function (key) {
      if (key === 'docs') return

      memo.concat(this.expand(token + key, memo))
    }, this)

  return memo
}
/*!
 * lunr.ratchetintegration
 * Copyright (C) 2013 Simon Waldherr
 */

var searchindexes = new Array();

function indexList(listid, searchid) {
  var lunrid = 'lid'+searchindexes.length,
  listeles = document.getElementById(listid).getElementsByTagName('li'),
  text;

  if(document.getElementById(searchid).hasAttribute('data-lid') !== 1) {
    document.getElementById(searchid).setAttribute('data-lid', lunrid);

    searchindexes[lunrid] = lunr(function() {
      this.field('text');
    })

    for(var i = 0; i < listeles.length; i++) {
      if(listeles[i].hasAttribute('data-noindex') !== true) {
        if(typeof listeles[i].innerText !== 'undefined') {
          if(listeles[i].innerText.length > 2) {
            text = {"text" : listeles[i].innerText, "id" : i}
            searchindexes[lunrid].add(text);
          }
        }
      }
    }
  }
}

function searchList(listid, searchid, searchstring) {
  var lunrid = document.getElementById(searchid).getAttribute('data-lid'),
  listeles = document.getElementById(listid).getElementsByTagName('li'),
  found = searchindexes[lunrid].search(searchstring),
  foundbool, score;

  for(var i = 0; i < listeles.length; i++) {
    if(searchstring.length > 1) {
      foundbool = false;
      score = 0;
      for(var j = 0; j < found.length; j++) {
        if(parseInt(found[j].ref) === i) {
          foundbool = true;
          score = found[j].score;
        }
      }
      if(listeles[i].hasAttribute('data-noindex') !== true) {
        if(foundbool) {
          if(score > 0.3) {
            listeles[i].style.opacity = 1;
          } else {
            listeles[i].style.opacity = 0.5;
          }
          //listeles[i].style.backgroundColor = '#e1dac7';
          //listeles[i].style.opacity = 1;
          listeles[i].style.display = 'list-item';
        } else {
          //listeles[i].style.backgroundColor = '#f5bca3';
          //listeles[i].style.opacity = 0.5;
          listeles[i].style.display = 'none';
        }
      }
    } else {
      listeles[i].style.opacity = 1;
      listeles[i].style.display = 'list-item';
    }
  }
}
/* ----------------------------------
 * MODAL v1.0.0
 * Licensed under The MIT License
 * http://opensource.org/licenses/MIT
 * ---------------------------------- */

!function () {
  "use strict";
  var findModals = function (target) {
    var i;
    var modals = document.querySelectorAll('a');
    for (; target && target !== document; target = target.parentNode) {
      for (i = modals.length; i--;) {
        if (modals[i] === target) {
          return target;
        }
      }
    }
  };

  var getModal = function (event) {
    var modalToggle = findModals(event.target);
    if (modalToggle && modalToggle.hash) {
      return document.querySelector(modalToggle.hash);
    }
  };

  window.addEventListener('touchend', function (event) {
    var modal = getModal(event);
    if (modal) {
      modal.classList.toggle('active');
    }
  });
}();
/* ----------------------------------
 * POPOVER v1.0.0
 * Licensed under The MIT License
 * http://opensource.org/licenses/MIT
 * ---------------------------------- */

!function () {
  "use strict";
  var popover;

  var findPopovers = function (target) {
    var i, popovers = document.querySelectorAll('a');
    for (; target && target !== document; target = target.parentNode) {
      for (i = popovers.length; i--;) {
        if (popovers[i] === target) {
          return target;
        }
      }
    }
  };

  var onPopoverHidden = function () {
    document.body.removeChild(backdrop);
    popover.style.display = 'none';
    popover.removeEventListener('webkitTransitionEnd', onPopoverHidden);
  };

  var backdrop = function () {
    var element = document.createElement('div');

    element.classList.add('backdrop');

    element.addEventListener('touchend', function () {
      popover.addEventListener('webkitTransitionEnd', onPopoverHidden);
      popover.classList.remove('visible');
    });

    return element;
  }();

  var getPopover = function (e) {
    var anchor = findPopovers(e.target);

    if (!anchor || !anchor.hash) {
      return;
    }

    popover = document.querySelector(anchor.hash);

    if (!popover || !popover.classList.contains('popover')) {
      return;
    }

    return popover;
  };

  window.addEventListener('touchend', function (e) {
    var popover = getPopover(e);

    if (!popover) {
      return;
    }

    popover.style.display = 'block';
    //popover.offsetHeight;
    popover.classList.add('visible');

    popover.parentNode.appendChild(backdrop);
  });

  window.addEventListener('click', function (e) {
    if (getPopover(e)) {
      e.preventDefault();
    }
  });

}();
/* ----------------------------------
 * PullToRefresh v0.008
 * By Simon Waldherr
 * https://github.com/SimonWaldherr/PullToRefresh
 * Licensed under The MIT License
 * http://opensource.org/licenses/MIT
 * ---------------------------------- */

var ptr = [];
var ptr_init = function () {
  "use strict";
  var i = 0;
  ptr.scrollable_parent = false;
  ptr.scrollables = document.getElementsByClassName('ptr_scrollable');
  if ((window.hasOwnProperty('ontouchstart')) || (window.navigator.msPointerEnabled)) {
    document.getElementsByTagName('body')[0].className += ' touch';
  } else {
    document.getElementsByTagName('body')[0].className += ' notouch';
  }

  for (i = 0; i < ptr.scrollables.length; i += 1) {
    if (ptr.scrollables[i].hasAttribute('data-url') !== false) {
      ptr.box = document.createElement('div');
      ptr.container = document.createElement('div');
      ptr.image = document.createElement('div');
      ptr.text = document.createElement('div');

      ptr.box.appendChild(ptr.container);
      ptr.container.appendChild(ptr.image);
      ptr.container.appendChild(ptr.text);
      ptr.text.innerHTML = 'Pull to refresh';

      ptr.box.className = 'ptr_box';
      ptr.box.style.right = '99%';
      ptr.container.className = 'ptr_container';
      ptr.image.className = 'ptr_image';
      ptr.text.className = 'ptr_text';

      ptr.scrollables[i].firstElementChild.insertBefore(ptr.box, ptr.scrollables[i].firstElementChild.firstChild);
    }
  }

  document.addEventListener('touchstart', function (e) {
    var parent = e.target,
      i = 0;

    if (parent.className === undefined) {
      return false;
    }

    for (i = 0; i < 10; i += 1) {
      if (parent.className !== undefined) {

        if (parent.className.match('ptr_scrollable')) {

          ptr.scrollable_parent = i;
          i = 10;

          if (parent.hasAttribute('data-url') !== false) {
            if (parent.getElementsByClassName('ptr_box')[0] === undefined) {
              ptr.box = document.createElement('div');
              ptr.container = document.createElement('div');
              ptr.image = document.createElement('div');
              ptr.text = document.createElement('div');

              ptr.box.appendChild(ptr.container);
              ptr.container.appendChild(ptr.image);
              ptr.container.appendChild(ptr.text);
              ptr.text.innerHTML = 'Pull to refresh';

              ptr.box.className = 'ptr_box';
              ptr.box.style.right = '0px';
              ptr.container.className = 'ptr_container';
              ptr.image.className = 'ptr_image';
              ptr.text.className = 'ptr_text';

              parent.firstElementChild.insertBefore(ptr.box, parent.firstElementChild.firstChild);
            } else {
              parent.getElementsByClassName('ptr_box')[0].style.opacity = 1.0;
              parent.getElementsByClassName('ptr_text')[0].innerHTML = 'Pull to refresh';
            }
          } else if (parent.getElementsByClassName('ptr_box')[0] !== undefined) {
            parent.removeChild(parent.getElementsByClassName('ptr_box')[0]);
          }

          if (parent.scrollTop === 0) {
            parent.scrollTop = 1;
            parent.getElementsByClassName('ptr_wrap')[0].style.top = '1px';
          } else if ((parent.scrollTop + parent.offsetHeight) === parent.scrollHeight) {
            parent.scrollTop = parent.scrollTop - 1;
          }
        }
      }

      if ((parent.parentNode.tagName === undefined)) {
        i = 10;
        return false;
      }
      if ((parent.parentNode.tagName === 'BODY') || (parent.parentNode.tagName === 'HTML')) {
        i = 10;
        return false;
      }

      parent = parent.parentNode;
    }
  });

  document.addEventListener('touchmove', function (e) {
    var parent = e.target,
      scroll = false,
      rotate = 90,
      i = 0,
      top, scrolldistance, time, insert, inserted, ajax, ajaxTimeout, requrl;

    if (ptr.scrollable_parent === false) {
      e.preventDefault();
      return false;
    }

    for (i = 0; i < ptr.scrollable_parent; i += 1) {
      parent = parent.parentNode;
    }

    if ((ptr.scrollable_parent !== false) && (parent.hasAttribute('data-url') !== false)) {

      scroll = true;

      ptr.element = parent;
      ptr.wrapelement = ptr.element.getElementsByClassName('ptr_wrap')[0];
      top = ptr.element.scrollTop;
      ptr.box = ptr.element.getElementsByClassName('ptr_box')[0];
      scrolldistance = Math.abs(ptr.element.scrollTop);

      if ((ptr.wrapelement.className.indexOf(' active') === -1) && (!ptr.wrapelement.getElementsByClassName('ptr_image')[0].className.match('ptr_loading')) && (ptr.element.scrollTop < 1)) {
        if (ptr.element.scrollTop < -25) {
          rotate = (top < -40) ? -90 : 130 + parseInt(top * 12 + 270, 10);
        }

        if (ptr.element.scrollTop < 0) {
          ptr.box.style.right = '0px';
          ptr.wrapelement.getElementsByClassName('ptr_image')[0].style['-webkit-transform'] = 'scale(1) rotate(' + rotate + 'deg)';
        }

        if (ptr.element.scrollTop < -51) {
          if (ptr.wrapelement.className.indexOf(' ptr_active') === -1) {
            ptr.box.style.right = '0px';
            ptr.wrapelement.className += ' ptr_active';
            ptr.wrapelement.getElementsByClassName('ptr_text')[0].innerHTML = 'Loading ...';
            ptr.wrapelement.getElementsByClassName('ptr_image')[0].className += ' ptr_loading';

            if (parent.getAttribute('data-url') === 'reload') {
              window.location.reload(true);
              return false;
            }

            ptr.element = parent;
            ptr.wrapelement = ptr.element.getElementsByClassName('ptr_wrap')[0];
            ptr.eleId = parent.id;
            time = new Date();

            ajax = (window.ActiveXObject) ? new ActiveXObject("Microsoft.XMLHTTP") : (XMLHttpRequest && new XMLHttpRequest()) || null;
            ajaxTimeout = window.setTimeout(function () {
              ajax.abort();
              console.log("AJAX Timeout Error");
            }, 6000);
            ajax.onreadystatechange = function () {

              if (ajax.readyState === 4) {
                if (ajax.status === 200) {
                  clearTimeout(ajaxTimeout);
                  //console.log("AJAX-Status: " + ajax.status + " " + ajax.statusText + " at " + time.getTime());
                  if (ajax.status !== 200) {
                    console.log("AJAX Response Error");
                    alert('Could not connect');
                    ptr.wrapelement.style.top = '0px';
                    ptr.box.getElementsByClassName('ptr_image')[0].className = ptr.getElementsByClassName('ptr_image')[0].className.replace(' loading', '');
                    ptr.wrapelement.className = ptr.wrapelement.className.replace(' ptr_active', '');
                  } else {
                    ptr.box = document.getElementById(ptr.eleId).getElementsByClassName('ptr_box')[0];
                    insert = document.createElement('div');
                    insert.innerHTML = ajax.responseText;
                    insert.className = 'ptr_inserted';

                    ptr.wrapelement.insertBefore(insert, ptr.box.nextSibling);
                    ptr.wrapelement.style.top = '0px';
                    ptr.box.getElementsByClassName('ptr_image')[0].className = ptr.box.getElementsByClassName('ptr_image')[0].className.replace(' ptr_loading', '');
                    ptr.wrapelement.className = ptr.wrapelement.className.replace(' ptr_active', '');
                    inserted = document.getElementsByClassName('ptr_inserted')[0];
                    ptr.element.scrollTop = inserted.clientHeight - 51;
                    ptr.wrapelement.getElementsByClassName('ptr_text')[0].innerHTML = '';
                    ptr.box.style.right = '99%';

                    ptr.wrapelement.getElementsByClassName('ptr_image')[0].className = ptr.wrapelement.getElementsByClassName('ptr_image')[0].className.replace(' ptr_loading', '');

                    ptr.scrollable_parent = false;
                  }
                }
              }
            };
            requrl = parent.getAttribute('data-url') + '?rt=' + time.getTime();
            ajax.open("POST", requrl, true);
            ajax.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
            ajax.send();
          }
        } else if (ptr.element.scrollTop !== 0) {
          if (ptr.wrapelement.className.indexOf(' active') !== -1) {
            ptr.wrapelement.className = ptr.wrapelement.className.replace(' ptr_active', '');
            ptr.wrapelement.getElementsByClassName('ptr_text')[0].innerHTML = 'Pull to refresh';
          }
        }
      }
    } else if ((ptr.scrollable_parent !== false)) {
      scroll = true;
    }

    if (scroll === false) {
      e.preventDefault();
    }
  });

  document.addEventListener('touchend', function (e) {
    var parent = e.target,
      i = 0,
      top;

    for (i = 0; i < ptr.scrollable_parent; i += 1) {
      parent = parent.parentNode;
    }

    if ((parent.hasAttribute('data-url') !== false) && (ptr.scrollable_parent !== false)) {
      if ((parent.hasAttribute('data-url') !== false)) {
        ptr.element = parent;
        ptr.wrapelement = ptr.element.getElementsByClassName('ptr_wrap')[0];
        ptr.eleId = parent.id;
        top = ptr.element.scrollTop;
        ptr.box = ptr.element.getElementsByClassName('ptr_box')[0];

        if (ptr.wrapelement.getElementsByClassName('ptr_image')[0].className.match('ptr_loading')) {
          ptr.wrapelement.className = ptr.wrapelement.className.replace(' ptr_active', '');
          ptr.wrapelement.style.top = '51px';
        } else {
          ptr.box.style.right = '99%';
        }
      }
    }

    ptr.scrollable_parent = false;
  });
};

window.onload = function() {
  ptr_init();
}
/* ----------------------------------
 * PUSH v1.0.0
 * Licensed under The MIT License
 * inspired by chris's jquery.pjax.js
 * http://opensource.org/licenses/MIT
 * ---------------------------------- */

!function () {
  "use strict";
  var noop = function () {};

  // Pushstate cacheing
  // ==================

  var isScrolling,
    maxCacheLength = 20,
    cacheMapping = sessionStorage,
    domCache = {},
    transitionMap = {
      'slide-in': 'slide-out',
      'slide-out': 'slide-in',
      'fade': 'fade'
    },
    bars = {
      bartab: '.bar-tab',
      bartitle: '.bar-title',
      barfooter: '.bar-footer',
      barheadersecondary: '.bar-header-secondary'
    };

  var cacheReplace = function (data, updates) {
    PUSH.id = data.id;
    if (updates) {
      data = getCached(data.id);
    }
    cacheMapping[data.id] = JSON.stringify(data);
    window.history.replaceState(data.id, data.title, data.url);
    domCache[data.id] = document.body.cloneNode(true);
  };

  var cachePush = function () {
    var id = PUSH.id,
      cacheForwardStack = JSON.parse(cacheMapping.cacheForwardStack || '[]'),
      cacheBackStack = JSON.parse(cacheMapping.cacheBackStack || '[]');

    cacheBackStack.push(id);

    while (cacheForwardStack.length) {
      delete cacheMapping[cacheForwardStack.shift()];
    }
    while (cacheBackStack.length > maxCacheLength) {
      delete cacheMapping[cacheBackStack.shift()];
    }

    window.history.pushState(null, '', cacheMapping[PUSH.id].url);

    cacheMapping.cacheForwardStack = JSON.stringify(cacheForwardStack);
    cacheMapping.cacheBackStack = JSON.stringify(cacheBackStack);
  };

  var cachePop = function (id, direction) {
    var forward = direction === 'forward',
      cacheForwardStack = JSON.parse(cacheMapping.cacheForwardStack || '[]'),
      cacheBackStack = JSON.parse(cacheMapping.cacheBackStack || '[]'),
      pushStack = forward ? cacheBackStack : cacheForwardStack,
      popStack = forward ? cacheForwardStack : cacheBackStack;

    if (PUSH.id) {
      pushStack.push(PUSH.id);
    }
    popStack.pop();

    cacheMapping.cacheForwardStack = JSON.stringify(cacheForwardStack);
    cacheMapping.cacheBackStack = JSON.stringify(cacheBackStack);
  };

  var getCached = function (id) {
    return JSON.parse(cacheMapping[id] || null) || {};
  };

  var getTarget = function (e) {
    var target = findTarget(e.target);

    if (!target || (e.which > 1) || e.metaKey || e.ctrlKey || isScrolling || (location.protocol !== target.protocol) || (location.host !== target.host) || (!target.hash && /#/.test(target.href)) || (target.hash && target.href.replace(target.hash, '') === location.href.replace(location.hash, '')) || (target.getAttribute('data-ignore') === 'push')) {
      return;
    }

    return target;
  };


  // Main event handlers (touchend, popstate)
  // ==========================================

  var touchend = function (e) {
    var target = getTarget(e);

    if (!target) {
      return;
    }

    e.preventDefault();

    PUSH({
      url: target.href,
      hash: target.hash,
      timeout: target.getAttribute('data-timeout'),
      transition: target.getAttribute('data-transition')
    });
  };

  var popstate = function (e) {
    var key,
      barElement,
      activeObj,
      activeDom,
      direction,
      transition,
      transitionFrom,
      transitionFromObj,
      id = e.state;

    if (!id || !cacheMapping[id]) {
      return;
    }

    direction = (PUSH.id < id) ? 'forward' : 'back';

    cachePop(id, direction);

    activeObj = getCached(id);
    activeDom = domCache[id];

    if (activeObj.title) {
      document.title = activeObj.title;
    }

    if (direction === 'back') {
      transitionFrom = JSON.parse((direction === 'back') ? cacheMapping.cacheForwardStack : cacheMapping.cacheBackStack);
      transitionFromObj = getCached(transitionFrom[transitionFrom.length - 1]);
    } else {
      transitionFromObj = activeObj;
    }

    if (direction === 'back' && !transitionFromObj.id) {
      return id;
    }

    transition = (direction === 'back') ? transitionMap[transitionFromObj.transition] : transitionFromObj.transition;

    if (!activeDom) {
      return PUSH({
        id: activeObj.id,
        url: activeObj.url,
        title: activeObj.title,
        timeout: activeObj.timeout,
        transition: transition,
        ignorePush: true
      });
    }

    if (transitionFromObj.transition) {
      activeObj = extendWithDom(activeObj, '.content', activeDom.cloneNode(true));
      for (key in bars) {
        barElement = document.querySelector(bars[key]);
        if (activeObj[key]) {
          swapContent(activeObj[key], barElement);
        } else if (barElement) {
          barElement.parentNode.removeChild(barElement);
        }
      }
    }

    swapContent(
    (activeObj.contents || activeDom).cloneNode(true),
      document.querySelector('.content'),
      transition);

    PUSH.id = id;

    document.body.offsetHeight; // force reflow to prevent scroll
  };


  // Core PUSH functionality
  // =======================

  var PUSH = function (options) {
    var key,
      data = {},
      xhr = PUSH.xhr;

    options.container = options.container || options.transition ? document.querySelector('.content') : document.body;

    for (key in bars) {
      options[key] = options[key] || document.querySelector(bars[key]);
    }

    if (xhr && xhr.readyState < 4) {
      xhr.onreadystatechange = noop;
      xhr.abort()
    }

    xhr = new XMLHttpRequest();
    xhr.open('GET', options.url, true);
    xhr.setRequestHeader('X-PUSH', 'true');

    xhr.onreadystatechange = function () {
      if (options._timeout) clearTimeout(options._timeout);
      if (xhr.readyState === 4) {
        (xhr.status === 200) ? success(xhr, options) : failure(options.url);
      }
    };

    if (!PUSH.id) {
      cacheReplace({
        id: +new Date,
        url: window.location.href,
        title: document.title,
        timeout: options.timeout,
        transition: null
      });
    }

    if (options.timeout) {
      options._timeout = setTimeout(function () {
        xhr.abort('timeout');
      }, options.timeout);
    }

    xhr.send();

    if (xhr.readyState && !options.ignorePush) cachePush();
  };


  // Main XHR handlers
  // =================

  var success = function (xhr, options) {
    var key;
    var barElement;
    var data = parseXHR(xhr, options);

    if (!data.contents) return locationReplace(options.url);

    if (data.title) document.title = data.title;

    if (options.transition) {
      for (key in bars) {
        barElement = document.querySelector(bars[key])
        if (data[key]) swapContent(data[key], barElement);
        else if (barElement) barElement.parentNode.removeChild(barElement);
      }
    }

    swapContent(data.contents, options.container, options.transition, function () {
      cacheReplace({
        id: options.id || +new Date,
        url: data.url,
        title: data.title,
        timeout: options.timeout,
        transition: options.transition
      }, options.id);
      triggerStateChange();
    });

    if (!options.ignorePush && window._gaq) _gaq.push(['_trackPageview']) // google analytics
    if (!options.hash) return;
  };

  var failure = function (url) {
    throw new Error('Could not get: ' + url)
  };


  // PUSH helpers
  // ============

  var swapContent = function (swap, container, transition, complete) {
    "use strict";

    function fadeContainerEnd() {
      container.removeEventListener('webkitTransitionEnd', fadeContainerEnd);
      swap.classList.add('in');
      swap.addEventListener('webkitTransitionEnd', fadeSwapEnd);
    }

    function fadeSwapEnd() {
      swap.removeEventListener('webkitTransitionEnd', fadeSwapEnd);
      container.parentNode.removeChild(container);
      swap.classList.remove('fade');
      swap.classList.remove('in');
      complete && complete();
    }

    function slideEnd() {
      swap.removeEventListener('webkitTransitionEnd', slideEnd);
      swap.classList.remove('slide');
      swap.classList.remove(swapDirection);
      container.parentNode.removeChild(container);
      complete && complete();
    }
    var enter,
      containerDirection,
      swapDirection;

    if (!transition) {
      if (container) container.innerHTML = swap.innerHTML;
      else if (swap.classList.contains('content')) document.body.appendChild(swap);
      else document.body.insertBefore(swap, document.querySelector('.content'));
    } else {
      enter = /in$/.test(transition);

      if (transition === 'fade') {
        container.classList.add('in');
        container.classList.add('fade');
        swap.classList.add('fade');
      }

      if (/slide/.test(transition)) {
        swap.classList.add(enter ? 'right' : 'left');
        swap.classList.add('slide');
        container.classList.add('slide');
      }

      container.parentNode.insertBefore(swap, container);
    }

    if (!transition) {
      complete && complete();
    }

    if (transition === 'fade') {
      container.offsetWidth; // force reflow
      container.classList.remove('in');
      container.addEventListener('webkitTransitionEnd', fadeContainerEnd);
    }

    if (/slide/.test(transition)) {
      container.offsetWidth; // force reflow
      swapDirection = enter ? 'right' : 'left'
      containerDirection = enter ? 'left' : 'right'
      container.classList.add(containerDirection);
      swap.classList.remove(swapDirection);
      swap.addEventListener('webkitTransitionEnd', slideEnd);
    }
  };

  var triggerStateChange = function () {
    var e = new CustomEvent('push', {
      detail: {
        state: getCached(PUSH.id)
      },
      bubbles: true,
      cancelable: true
    });

    window.dispatchEvent(e);
  };

  var findTarget = function (target) {
    var i, toggles = document.querySelectorAll('a');
    for (; target && target !== document; target = target.parentNode) {
      for (i = toggles.length; i--;) {
        if (toggles[i] === target) return target;
      }
    }
  };

  var locationReplace = function (url) {
    window.history.replaceState(null, '', '#');
    window.location.replace(url);
  };

  var parseURL = function (url) {
    var a = document.createElement('a');
    a.href = url;
    return a;
  };

  var extendWithDom = function (obj, fragment, dom) {
    var i;
    var result = {};

    for (i = 0; i < obj.length; i += 1) {
      result[i] = obj[i];
    }

    Object.keys(bars).forEach(function (key) {
      var el = dom.querySelector(bars[key]);
      if (el) el.parentNode.removeChild(el);
      result[key] = el;
    });

    result.contents = dom.querySelector(fragment);

    return result;
  };

  var parseXHR = function (xhr, options) {
    var head,
      body,
      data = {},
      responseText = xhr.responseText;

    data.url = options.url;

    if (!responseText) {
      return data;
    }

    if (/<html/i.test(responseText)) {
      head = document.createElement('div');
      body = document.createElement('div');
      head.innerHTML = responseText.match(/<head[^>]*>([\s\S.]*)<\/head>/i)[0]
      body.innerHTML = responseText.match(/<body[^>]*>([\s\S.]*)<\/body>/i)[0]
    } else {
      head = body = document.createElement('div');
      head.innerHTML = responseText;
    }

    data.title = head.querySelector('title');
    data.title = data.title && data.title.innerText.trim();

    if (options.transition) {
      data = extendWithDom(data, '.content', body);
    } else {
      data.contents = body;
    }

    return data;
  };


  // Attach PUSH event handlers
  // ==========================

  window.addEventListener('touchstart', function () {
    isScrolling = false;
  });
  window.addEventListener('touchmove', function () {
    isScrolling = true;
  })
  window.addEventListener('touchend', touchend);
  window.addEventListener('click', function (e) {
    if (getTarget(e)) e.preventDefault();
  });
  window.addEventListener('popstate', popstate);

}();
/* ----------------------------------
 * TABS v1.0.0
 * Licensed under The MIT License
 * http://opensource.org/licenses/MIT
 * ---------------------------------- */

!function () {
  "use strict";
  var getTarget = function (target) {
    var i, popovers = document.querySelectorAll('.segmented-controller li a');
    for (; target && target !== document; target = target.parentNode) {
      for (i = popovers.length; i--;) {
        if (popovers[i] === target) return target;
      }
    }
  };

  window.addEventListener("touchend", function (e) {
    var activeTab,
      activeBody,
      targetBody,
      targetTab,
      className = 'active',
      classSelector = '.' + className,
      targetAnchor = getTarget(e.target);

    if (!targetAnchor) {
      return;
    }

    targetTab = targetAnchor.parentNode;
    activeTab = targetTab.parentNode.querySelector(classSelector);

    if (activeTab) {
      activeTab.classList.remove(className);
    }

    targetTab.classList.add(className);

    if (!targetAnchor.hash) {
      return;
    }

    targetBody = document.querySelector(targetAnchor.hash);

    if (!targetBody) {
      return;
    }

    activeBody = targetBody.parentNode.querySelector(classSelector);

    if (activeBody) {
      activeBody.classList.remove(className);
    }

    targetBody.classList.add(className);
  });

  window.addEventListener('click', function (e) {
    if (getTarget(e.target)) e.preventDefault();
  });
}();
/* ----------------------------------
 * SLIDER v1.0.0
 * Licensed under The MIT License
 * Adapted from Brad Birdsall's swipe
 * http://opensource.org/licenses/MIT
 * ---------------------------------- */

!function () {
  "use strict";
  var pageX,
    pageY,
    slider,
    deltaX,
    deltaY,
    offsetX,
    lastSlide,
    startTime,
    resistance,
    sliderWidth,
    slideNumber,
    isScrolling,
    scrollableArea;

  var getSlider = function (target) {
    var i, sliders = document.querySelectorAll('.slider ul');
    for (; target && target !== document; target = target.parentNode) {
      for (i = sliders.length; i--;) {
        if (sliders[i] === target) return target;
      }
    }
  }

  var getScroll = function () {
    var translate3d = slider.style.webkitTransform.match(/translate3d\(([^,]*)/);
    return parseInt(translate3d ? translate3d[1] : 0)
  };

  var setSlideNumber = function (offset) {
    var round = offset ? (deltaX < 0 ? 'ceil' : 'floor') : 'round';
    slideNumber = Math[round](getScroll() / (scrollableArea / slider.children.length));
    slideNumber += offset;
    slideNumber = Math.min(slideNumber, 0);
    slideNumber = Math.max(-(slider.children.length - 1), slideNumber);
  }

  var onTouchStart = function (e) {
    slider = getSlider(e.target);

    if (!slider) return;

    var firstItem = slider.querySelector('li');

    scrollableArea = firstItem.offsetWidth * slider.children.length;
    isScrolling = undefined;
    sliderWidth = slider.offsetWidth;
    resistance = 1;
    lastSlide = -(slider.children.length - 1);
    startTime = +new Date;
    pageX = e.touches[0].pageX;
    pageY = e.touches[0].pageY;

    setSlideNumber(0);

    slider.style['-webkit-transition-duration'] = 0;
  };

  var onTouchMove = function (e) {
    if (e.touches.length > 1 || !slider) return; // Exit if a pinch || no slider

    deltaX = e.touches[0].pageX - pageX;
    deltaY = e.touches[0].pageY - pageY;
    pageX = e.touches[0].pageX;
    pageY = e.touches[0].pageY;

    if (typeof isScrolling == 'undefined') {
      isScrolling = Math.abs(deltaY) > Math.abs(deltaX);
    }

    if (isScrolling) return;

    offsetX = (deltaX / resistance) + getScroll();

    e.preventDefault();

    resistance = slideNumber == 0 && deltaX > 0 ? (pageX / sliderWidth) + 1.25 :
      slideNumber == lastSlide && deltaX < 0 ? (Math.abs(pageX) / sliderWidth) + 1.25 : 1;

    slider.style.webkitTransform = 'translate3d(' + offsetX + 'px,0,0)';
  };

  var onTouchEnd = function (e) {
    if (!slider || isScrolling) return;

    setSlideNumber(
    (+new Date) - startTime < 1000 && Math.abs(deltaX) > 15 ? (deltaX < 0 ? -1 : 1) : 0);

    offsetX = slideNumber * sliderWidth;

    slider.style['-webkit-transition-duration'] = '.2s';
    slider.style.webkitTransform = 'translate3d(' + offsetX + 'px,0,0)';

    e = new CustomEvent('slide', {
      detail: {
        slideNumber: Math.abs(slideNumber)
      },
      bubbles: true,
      cancelable: true
    });

    slider.parentNode.dispatchEvent(e);
  };

  window.addEventListener('touchstart', onTouchStart);
  window.addEventListener('touchmove', onTouchMove);
  window.addEventListener('touchend', onTouchEnd);

}();
/* ----------------------------------
 * TOGGLE v1.0.0
 * Licensed under The MIT License
 * http://opensource.org/licenses/MIT
 * ---------------------------------- */

!function () {
  "use strict";
  var start = {},
    touchMove = false,
    distanceX = false,
    toggle = false;

  var findToggle = function (target) {
    var i, toggles = document.querySelectorAll('.toggle');
    for (; target && target !== document; target = target.parentNode) {
      for (i = toggles.length; i--;) {
        if (toggles[i] === target) return target;
      }
    }
  }

  window.addEventListener('touchstart', function (e) {
    e = e.originalEvent || e;

    toggle = findToggle(e.target);

    if (!toggle) {
      return;
    }

    var handle = toggle.querySelector('.toggle-handle'),
      toggleWidth = toggle.offsetWidth,
      handleWidth = handle.offsetWidth,
      offset = toggle.classList.contains('active') ? (toggleWidth - handleWidth) : 0;

    start = {
      pageX: e.touches[0].pageX - offset,
      pageY: e.touches[0].pageY
    };
    touchMove = false;

    // todo: probably should be moved to the css
    toggle.style['-webkit-transition-duration'] = 0;
  });

  window.addEventListener('touchmove', function (e) {
    e = e.originalEvent || e;

    if (e.touches.length > 1) return; // Exit if a pinch

    if (!toggle) return;

    var handle = toggle.querySelector('.toggle-handle'),
      current = e.touches[0],
      toggleWidth = toggle.offsetWidth,
      handleWidth = handle.offsetWidth,
      offset = toggleWidth - handleWidth;

    touchMove = true;
    distanceX = current.pageX - start.pageX;

    if (Math.abs(distanceX) < Math.abs(current.pageY - start.pageY)) {
      return;
    }

    e.preventDefault();

    if (distanceX < 0) {
      return handle.style.webkitTransform = 'translate3d(0,0,0)';
    }
    if (distanceX > offset) {
      return handle.style.webkitTransform = 'translate3d(' + offset + 'px,0,0)';
    }

    handle.style.webkitTransform = 'translate3d(' + distanceX + 'px,0,0)';

    toggle.classList[(distanceX > (toggleWidth / 2 - handleWidth / 2)) ? 'add' : 'remove']('active');
  });

  window.addEventListener('touchend', function (e) {
    if (!toggle) return;

    var handle = toggle.querySelector('.toggle-handle'),
      toggleWidth = toggle.offsetWidth,
      handleWidth = handle.offsetWidth,
      offset = toggleWidth - handleWidth,
      slideOn = (!touchMove && !toggle.classList.contains('active')) || (touchMove && (distanceX > (toggleWidth / 2 - handleWidth / 2)));

    if (slideOn) {
      handle.style.webkitTransform = 'translate3d(' + offset + 'px,0,0)';
    } else {
      handle.style.webkitTransform = 'translate3d(0,0,0)';
    }

    toggle.classList[slideOn ? 'add' : 'remove']('active');

    e = new CustomEvent('toggle', {
      detail: {
        isActive: slideOn
      },
      bubbles: true,
      cancelable: true
    });

    toggle.dispatchEvent(e);

    touchMove = false;
    toggle = false;
  });

}();
