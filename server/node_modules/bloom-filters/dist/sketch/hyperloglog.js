"use strict";
/* file: hyperloglog.ts
MIT License

Copyright (c) 2019-2020 Thomas Minier

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the 'Software'), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var xxhashjs_1 = __importDefault(require("xxhashjs"));
var base_filter_1 = __importDefault(require("../base-filter"));
var exportable_1 = require("../exportable");
var utils_1 = require("../utils");
// 2^32, computed as a constant as we use it a lot in the HyperLogLog algorithm
var TWO_POW_32 = Math.pow(2, 32);
/**
 * Estimlate the bias-correction constant, denoted alpha in the algorithm, based on the number of registers.
 * As alpha is pretty expensive to compute, we estimate it with the formula from Flajolet et al.
 * @param m - Number of registers in the HyperLogLog algorithm
 * @return The estimated bias-correction constant
 */
function computeAlpha(m) {
    if (m < 16) {
        return 1;
    }
    else if (m < 32) {
        return 0.673;
    }
    else if (m < 64) {
        return 0.697;
    }
    else if (m < 128) {
        return 0.709;
    }
    else {
        // >= 128
        return 0.7213 / (1.0 + 1.079 / m);
    }
}
/**
 * HyperLogLog is an algorithm for the count-distinct problem, approximating the number of distinct elements in a multiset.
 * @see HyperLogLog: the analysis of a near-optimal cardinality estimation algorithm {@link http://algo.inria.fr/flajolet/Publications/FlFuGaMe07.pdf}
 * @author Thomas Minier
 */
var HyperLogLog = /** @class */ (function (_super) {
    __extends(HyperLogLog, _super);
    /**
     * Constructor
     * @param nbRegisters - The number of registers to use
     */
    function HyperLogLog(nbRegisters) {
        var _this = _super.call(this) || this;
        if ((nbRegisters & (nbRegisters - 1)) !== 0) {
            throw new Error('The number of registers should be a power of 2');
        }
        _this._nbRegisters = nbRegisters;
        _this._nbBytesPerHash = Math.ceil(Math.log2(nbRegisters));
        _this._correctionBias = computeAlpha(nbRegisters);
        _this._registers = (0, utils_1.allocateArray)(_this._nbRegisters, 0);
        return _this;
    }
    HyperLogLog_1 = HyperLogLog;
    Object.defineProperty(HyperLogLog.prototype, "nbRegisters", {
        /**
         * Get the number of registers used by the HyperLogLog
         */
        get: function () {
            return this._nbRegisters;
        },
        enumerable: false,
        configurable: true
    });
    /**
     * Update The multiset with a new element
     * @param element - Element to add
     */
    HyperLogLog.prototype.update = function (element) {
        var hashedValue = xxhashjs_1.default.h64(element, this.seed)
            .toString(2)
            .padStart(64, '0');
        var k = 64 - this._nbBytesPerHash;
        var registerIndex = parseInt(hashedValue.slice(k), 2);
        // find the left most 1-bit in the second part of the buffer
        var second = hashedValue.slice(0, k);
        var leftmost_pos = k - 1;
        var found = false;
        var i = 0;
        while (!found && i < second.length) {
            if (second[i] === '1') {
                found = true;
                leftmost_pos = i;
            }
            else {
                i++;
            }
        }
        // update the register
        this._registers[registerIndex] = Math.max(this._registers[registerIndex], leftmost_pos);
    };
    /**
     * Estimate the cardinality of the multiset
     * @return The estimated cardinality of the multiset
     */
    HyperLogLog.prototype.count = function (round) {
        if (round === void 0) { round = false; }
        // Use the standard HyperLogLog estimator
        var Z = this._registers.reduce(function (acc, value) { return acc + Math.pow(2, -value); }, 0);
        var raw_estimation = (this._correctionBias * this._nbRegisters * this._nbRegisters * 2) / Z;
        var corrected_estimation;
        if (raw_estimation <= (5 / 2) * this._nbRegisters) {
            // use linear counting to correct the estimation if E < 5m/2 and some registers are set to zero
            var V = this._registers.filter(function (value) { return value === 0; }).length;
            if (V > 0) {
                // small range correction: linear counting
                corrected_estimation =
                    this._nbRegisters * Math.log(this._nbRegisters / V);
            }
            else {
                corrected_estimation = raw_estimation;
            }
        }
        else if (raw_estimation <= TWO_POW_32 / 30) {
            // middle range correction; no correction
            corrected_estimation = raw_estimation;
        }
        else {
            // raw_estimation > TWO_POW_32 / 30
            // large range correction
            corrected_estimation =
                -TWO_POW_32 * Math.log(1 - raw_estimation / TWO_POW_32);
        }
        if (round) {
            return Math.round(corrected_estimation);
        }
        return corrected_estimation;
    };
    /**
     * Compute the accuracy of the cardinality estimation produced by this HyperLogLog
     * @return The accuracy of the cardinality estimation
     */
    HyperLogLog.prototype.accuracy = function () {
        return 1.04 / Math.sqrt(this._nbRegisters);
    };
    /**
     * Perform the union with another HyperLogLog multiset
     * @param other - Multiset ot merge with
     * @return The union of the two multisets
     */
    HyperLogLog.prototype.merge = function (other) {
        if (this.nbRegisters !== other.nbRegisters) {
            throw new Error("Two HyperLogLog must have the same number of registers to be merged. Tried to merge two HyperLogLog with m = ".concat(this.nbRegisters, " and m = ").concat(other.nbRegisters));
        }
        var newSketch = new HyperLogLog_1(this.nbRegisters);
        for (var i = 0; i < this.nbRegisters; i++) {
            newSketch._registers[i] = Math.max(this._registers[i], other._registers[i]);
        }
        return newSketch;
    };
    /**
     * Check if another HyperLogLog is equal to this one
     * @param  other - The HyperLogLog to compare to this one
     * @return True if they are equal, false otherwise
     */
    HyperLogLog.prototype.equals = function (other) {
        if (this.nbRegisters !== other.nbRegisters) {
            return false;
        }
        for (var i = 0; i < this.nbRegisters - 1; i++) {
            if (this._registers[i] !== other._registers[i]) {
                return false;
            }
        }
        return true;
    };
    var HyperLogLog_1;
    __decorate([
        (0, exportable_1.Field)(),
        __metadata("design:type", Number)
    ], HyperLogLog.prototype, "_nbRegisters", void 0);
    __decorate([
        (0, exportable_1.Field)(),
        __metadata("design:type", Number)
    ], HyperLogLog.prototype, "_nbBytesPerHash", void 0);
    __decorate([
        (0, exportable_1.Field)(),
        __metadata("design:type", Number)
    ], HyperLogLog.prototype, "_correctionBias", void 0);
    __decorate([
        (0, exportable_1.Field)(),
        __metadata("design:type", Array)
    ], HyperLogLog.prototype, "_registers", void 0);
    HyperLogLog = HyperLogLog_1 = __decorate([
        (0, exportable_1.AutoExportable)('HyperLogLog', ['_seed']),
        __param(0, (0, exportable_1.Parameter)('_nbRegisters')),
        __metadata("design:paramtypes", [Number])
    ], HyperLogLog);
    return HyperLogLog;
}(base_filter_1.default));
exports.default = HyperLogLog;
