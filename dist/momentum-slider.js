/* eslint-disable */
(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
        typeof define === 'function' && define.amd ? define([], factory) :
            (global.MomentumSlider = factory());
}(this, (function () {
    'use strict';
    /* eslint-enable */

    // fixes weird safari 10 bug where preventDefault is prevented
    // @see https://github.com/metafizzy/flickity/issues/457#issuecomment-254501356
    window.addEventListener('touchmove', function () {});

    function MomentumSlider(options) {
        this.o = extend({}, this.defaults, options);
        this.initHtml();
        this.initValues();
        this.initEvents();
        this.updateClassnames();
    }

    MomentumSlider.prototype = {
        defaults: {
            el: '.ms-container',
            cssClass: '',
            vertical: false,
            multiplier: 1,
            bounceCoefficient: 0.3,
            bounceMax: 100,
            loop: 0,
            interactive: true,
            reverse: false,
            currentIndex: 0
        },
        initHtml: function () {
            this.msContainer = is.str(this.o.el) ? document.querySelector(this.o.el) : this.o.el;
            if (this.o.range) {
                var html = '<div class="ms-container ' + this.o.cssClass + '"><ul class="ms-track">';
                for (var i = this.o.range[0]; i <= this.o.range[1]; i++) {
                    html += is.fnc(this.o.rangeContent) ? buildSlide(this.o.rangeContent(i)) : buildSlide(i);
                }
                html += '</ul></div>';
                var msHtml = document.createElement('div');
                msHtml.innerHTML = html;
                this.msContainer.appendChild(msHtml.firstChild);
                this.msContainer = this.msContainer.lastChild;
            }
            this.msContainer.classList.add('ms-container--' + (this.o.vertical ? 'vertical' : 'horizontal'));
            if (this.o.reverse) {
                this.msContainer.classList.add('ms-container--reverse');
            }
            this.msTrack = this.msContainer.children[0];
            this.msSlides = this.msTrack.children;
            this.step = this.o.vertical ? this.msSlides[0].scrollHeight : this.msSlides[0].scrollWidth;
            this.sliderLength = this.msSlides.length;
            if (this.o.loop) {
                var loopLength, slideIndex, fragment;
                // begin
                fragment = document.createDocumentFragment();
                loopLength = this.o.loop;
                slideIndex = this.sliderLength - loopLength;
                while (loopLength--) {
                    fragment.appendChild(this.msSlides[slideIndex++].cloneNode(true));
                }
                this.msTrack.insertBefore(fragment, this.msTrack.firstChild);
                // end
                fragment = document.createDocumentFragment();
                slideIndex = loopLength = this.o.loop;
                while (loopLength--) {
                    fragment.appendChild(this.msSlides[slideIndex++].cloneNode(true));
                }
                this.msTrack.appendChild(fragment);
                // update
                this.sliderLength += this.o.loop * 2;
            }
            this.sliderWidth = this.sliderLength * this.step;
        },
        initValues: function () {
            this.boundMin = this.o.reverse ? 0 : -this.step * (this.sliderLength - 1);
            this.boundMax = this.o.reverse ? this.step * (this.sliderLength - 1) : 0;
            this.targetPosition = this.targetPosition || 0;
            this.ticking = false;
            this.enabled = true;
            this.pointerActive = false;
            this.pointerMoved = false;
            this.trackingPoints = [];
            this.msTrack.style[this.o.vertical ? 'height' : 'width'] = this.sliderWidth + 'px';
            this.currentIndex = (this.currentIndex || this.o.currentIndex) + this.o.loop;
            this.updateSlider(undefined, true);
            this.renderTarget();
            var index = this.sliderLength;
            while (index--) {
                this.setStyle(index, this.currentIndex == index ? 0 : -1);
            }
        },
        initEvents: function () {
            if (this.o.interactive) {
                this.msContainer.addEventListener('touchstart', this.onDown.bind(this));
                this.msContainer.addEventListener('mousedown', this.onDown.bind(this));
                document.addEventListener('touchmove', this.onMove.bind(this), getPassiveSupported() ? {
                    passive: false
                } : false);
                document.addEventListener('touchend', this.onUp.bind(this));
                document.addEventListener('touchcancel', this.stopTracking.bind(this));
                document.addEventListener('mousemove', this.onMove.bind(this), getPassiveSupported() ? {
                    passive: false
                } : false);
                document.addEventListener('mouseup', this.onUp.bind(this));
                if (this.o.prevEl) {
                    this.prevEl = is.str(this.o.prevEl) ? document.querySelector(this.o.prevEl) : this.o.prevEl;
                    this.prevEl.addEventListener('click', this.prev.bind(this));
                }
                if (this.o.nextEl) {
                    this.nextEl = is.str(this.o.nextEl) ? document.querySelector(this.o.nextEl) : this.o.nextEl;
                    this.nextEl.addEventListener('click', this.next.bind(this));
                }
            }
            window.addEventListener('resize', this.onResize.bind(this));
        },
        prev: function () {
            if (this.enabled) {
                this.updateSlider(Math.round(this.targetPosition / this.step) * this.step + (this.o.reverse ? -this.step : this.step));
            }
        },
        next: function () {
            if (this.enabled) {
                this.updateSlider(Math.round(this.targetPosition / this.step) * this.step + (this.o.reverse ? this.step : -this.step));
            }
        },
        select: function (index) {
            if (this.enabled) {
                // this.currentIndex = index;
                // this.updateSlider();
                this.updateSlider((index + this.o.loop) * (this.o.reverse ? this.step : -this.step));
            }
        },
        setStyleToNode: function (node, style, diff, lower) {
            if (style) {
                var value = '';
                for (var property in style) {
                    if (property[0] == '.') {
                        this.setStyleToNode(node.querySelector(property), style[property], diff, lower);
                    } else if (property == 'transform') {
                        style[property].forEach(function(transform) {
                            for (var t in transform) {
                                value += t + '(' + getCurrentValue(transform[t], diff, lower);
                                if (t == 'rotate') {
                                    value += 'deg';
                                } else if (t == 'translateX' || t == 'translateY' || t == 'translateZ') {
                                    value += 'px';
                                }
                                value += ') ';
                            }
                        });
                    } else {
                        value = getCurrentValue(style[property], diff, lower);
                    }
                    node.style[property] = value;
                }
            }
        },
        setStyle: function (index, diff, lower) {
            this.setStyleToNode(this.msSlides[index], this.o.style, diff, lower);
            if (is.fnc(this.o.customStyles)) {
                this.o.customStyles(index, diff, lower);
            }
        },
        renderTarget: function () {
            if (this.o.sync) {
                var syncIndex = this.o.sync.length;
                var syncSlider;
                while (syncIndex--) {
                    syncSlider = this.o.sync[syncIndex];
                    syncSlider.targetPosition = (syncSlider.o.reverse ? -1 : 1) * this.targetPosition / this.sliderWidth * syncSlider.sliderWidth;
                    syncSlider.renderTarget();
                }
            }

            var paddingLength = this.o.loop * this.step;
            var contentLength = this.sliderWidth - (paddingLength * 2);
            if (this.o.loop) {
                if (-this.targetPosition < paddingLength) {
                    while (-this.targetPosition < paddingLength) {
                        this.targetPosition -= contentLength;
                    }
                } else if (-this.targetPosition >= paddingLength + contentLength) {
                    while (-this.targetPosition >= paddingLength + contentLength) {
                        this.targetPosition += contentLength;
                    }
                }
            }

            // var actualIndex = -this.targetPosition / this.step;
            var actualIndex = (this.o.reverse ? 1 : -1) * this.targetPosition / this.step;
            this.onChangeCurrentIndex(Math.round(actualIndex));
            var lowerIndex = Math.floor(actualIndex);
            var higherIndex = Math.ceil(actualIndex);
            var lowerDiff = actualIndex - lowerIndex;
            var higherDiff = actualIndex - higherIndex;

            if (!is.und(this.lowerIndex) && this.lowerIndex != lowerIndex && this.lowerIndex != higherIndex) {
                this.setStyle(this.lowerIndex, 1, true);
            }
            if (!is.und(this.higherIndex) && this.higherIndex != lowerIndex && this.higherIndex != higherIndex) {
                this.setStyle(this.higherIndex, -1);
            }

            if (lowerIndex >= 0 && lowerIndex < this.sliderLength) {
                this.setStyle(lowerIndex, lowerDiff, true);
                this.lowerIndex = lowerIndex;
            }
            if (higherIndex >= 0 && higherIndex < this.sliderLength) {
                this.setStyle(higherIndex, higherDiff);
                this.higherIndex = higherIndex;
            }

            var transformValue = 'translate' + (this.o.vertical ? 'Y' : 'X') + '(' + this.targetPosition + 'px)';
            this.msTrack.style[transformProperty] = transformValue;
        },
        onDown: function (ev) {
            if (this.enabled && !this.pointerActive) {
                var event = normalizeEvent(ev);
                this.pointerActive = true;
                this.pointerId = event.id;

                this.pointerLastX = this.pointerCurrentX = event.x;
                this.pointerLastY = this.pointerCurrentY = event.y;
                this.trackingPoints = [];
                this.addTrackingPoint(this.pointerLastX, this.pointerLastY);

                if (this.animateInstance) this.animateInstance.stop();
            }
        },
        onMove: function (ev) {
            if (this.enabled && this.pointerActive) {
                this.pointerMoved = true;
                ev.preventDefault();
                var event = normalizeEvent(ev);

                if (event.id === this.pointerId) {
                    this.pointerCurrentX = event.x;
                    this.pointerCurrentY = event.y;
                    this.addTrackingPoint(this.pointerLastX, this.pointerLastY);
                    this.requestTick();
                }
            }
        },
        onUp: function (ev) {
            if (this.enabled && this.pointerActive) {
                var event = normalizeEvent(ev);

                if (event.id === this.pointerId) {
                    var slide = ev.target;
                    if (this.msTrack.contains(slide)) {
                        while (!slide.matches('.ms-slide, .ms-track')) {
                            slide = slide.parentNode;
                        }
                    }
                    var index = Array.prototype.indexOf.call(this.msSlides, slide);
                    if (!this.pointerMoved) {
                        if (index !== -1) {
                            this.currentIndex = index;
                            this.updateSlider();
                        }
                    }
                    this.stopTracking(index);
                }
            }
        },
        onResize: function () {
            // this.initValues();
        },
        stopTracking: function (index) {
            this.pointerActive = false;
            if (this.pointerMoved || index === -1) {
                this.pointerMoved = false;
                this.addTrackingPoint(this.pointerLastX, this.pointerLastY);
                this.startDecelAnim();
            }
        },
        addTrackingPoint: function (x, y) {
            var time = Date.now();
            while (this.trackingPoints.length > 0) {
                if (time - this.trackingPoints[0].time <= 100) {
                    break;
                }
                this.trackingPoints.shift();
            }

            this.trackingPoints.push({
                x: x,
                y: y,
                time: time
            });
        },
        updateAndRender: function () {
            var pointerChange = this.o.vertical ? this.pointerCurrentY - this.pointerLastY : this.pointerCurrentX - this.pointerLastX;
            this.targetPosition += pointerChange * this.o.multiplier;

            if (this.o.bounceCoefficient) {
                var diff = this.checkBounds();
                if (diff !== 0) {
                    this.targetPosition -= pointerChange * dragOutOfBoundsMultiplier(diff) * this.o.multiplier;
                }
            } else {
                this.checkBounds(true);
            }

            this.renderTarget();

            this.pointerLastX = this.pointerCurrentX;
            this.pointerLastY = this.pointerCurrentY;
            this.ticking = false;
        },
        requestTick: function () {
            if (!this.ticking) {
                requestAnimationFrame(this.updateAndRender.bind(this));
            }
            this.ticking = true;
        },
        checkBounds: function (restrict) {
            var diff = 0;

            if (this.boundMin !== undefined && this.targetPosition < this.boundMin) {
                diff = this.boundMin - this.targetPosition;
            } else if (this.boundMax !== undefined && this.targetPosition > this.boundMax) {
                diff = this.boundMax - this.targetPosition;
            }

            if (restrict) {
                if (diff !== 0) {
                    this.targetPosition = diff > 0 ? this.boundMin : this.boundMax;
                }
            }

            return diff;
        },
        startDecelAnim: function () {
            var firstPoint = this.trackingPoints[0];
            var lastPoint = this.trackingPoints[this.trackingPoints.length - 1];

            var positionOffset = this.o.vertical ? lastPoint.y - firstPoint.y : lastPoint.x - firstPoint.x;
            var timeOffset = lastPoint.time - firstPoint.time;

            var D = timeOffset / 15 / this.o.multiplier;
            this.decVel = positionOffset / D || 0;

            var newTargetPosition = this.targetPosition + (this.decVel * 12);
            var newTargetPositionOffset = newTargetPosition % this.step;
            newTargetPosition = newTargetPosition - newTargetPositionOffset;
            if (Math.abs(newTargetPositionOffset) > this.step / 2) {
                newTargetPosition += (newTargetPositionOffset > 0 ? 1 : -1) * this.step;
            }

            this.updateSlider(newTargetPosition);
        },
        fixCurrentIndex: function () {
            if (this.o.loop) {
                if (this.currentIndex < this.o.loop) {
                    this.currentIndex = this.sliderLength - this.o.loop + (this.currentIndex - this.o.loop);
                } else if (this.currentIndex > this.sliderLength - this.o.loop - 1) {
                    this.currentIndex = this.currentIndex + this.o.loop * 2 - this.sliderLength;
                }
            }
        },
        updateSlider: function (newTargetPosition, initial) {
            if (is.und(newTargetPosition)) {
                newTargetPosition = (this.o.reverse ? 1 : -1) * this.currentIndex * this.step;
            } else {
                this.currentIndex = (this.o.reverse ? 1 : -1) * newTargetPosition / this.step;
            }
            this.fixCurrentIndex();
            if (newTargetPosition !== this.targetPosition) {
                this.updateClassnames();
                this.animateTarget(newTargetPosition, initial);
            }
        },
        updateClassnames: function () {
            if (this.prevEl) {
                if (this.currentIndex === 0) {
                    this.prevEl.classList.add('ms-first');
                } else {
                    this.prevEl.classList.remove('ms-first');
                }
            }
            if (this.nextEl) {
                if (this.currentIndex === this.sliderLength - 1) {
                    this.nextEl.classList.add('ms-last');
                } else {
                    this.nextEl.classList.remove('ms-last');
                }
            }
        },
        animateTarget: function (newTargetPosition, initial, back) {
            if (this.animateInstance) this.animateInstance.stop();
            var _ = this;
            var from = this.targetPosition;
            var to = newTargetPosition;
            this.animateInstance = animate(function(progress) {
                _.targetPosition = to > from ? from + ((to - from) * progress) : from - ((from - to) * progress); // 0 - ((0 - -2100) * progress)
                var sliderMin = _.o.reverse ? 0 : -(_.sliderLength - 1) * _.step;
                var sliderMax = _.o.reverse ? (_.sliderLength - 1) * _.step : 0;
                if (!back &&
                    !_.o.loop &&
                    _.o.bounceCoefficient &&
                    (
                        (
                            _.targetPosition > sliderMax &&
                            _.targetPosition > sliderMax + Math.min((to - sliderMax) * _.o.bounceCoefficient, _.o.bounceMax)
                        ) ||
                        (
                            _.targetPosition < sliderMin &&
                            _.targetPosition < sliderMin - Math.min(-(to - sliderMin) * _.o.bounceCoefficient, _.o.bounceMax)
                        )
                    )
                ) {
                    _.animateInstance.stop();
                    _.animateTarget(_.targetPosition < sliderMin ? sliderMin : sliderMax, false, true);
                    _.currentIndex = _.targetPosition < sliderMin ? 0 : _.sliderLength - 1;
                } else {
                    _.renderTarget();
                }
            }, initial ? 0 : 500, function(t) { return t * (2 - t); });
        },
        onChangeCurrentIndex: function (index) {
            var currentIndex = this.o.loop ? index - this.o.loop : index;
            currentIndex = currentIndex === this.sliderLength - this.o.loop * 2 ? 0 : currentIndex;
            if (is.fnc(this.o.change) && currentIndex !== this.lastCurrentIndex) {
                this.o.change(currentIndex, this.lastCurrentIndex);
                this.lastCurrentIndex = currentIndex;
            }
        },
        getCurrentIndex: function () {
            return this.o.loop ? this.currentIndex - this.o.loop : this.currentIndex;
        },
        enable: function () {
            this.enabled = true;
        },
        disable: function () {
            this.enabled = false;
        }
    };


    // Utils

    var is = {
        arr: function (a) { return Array.isArray(a); },
        str: function (a) { return typeof a === 'string'; },
        und: function (a) { return typeof a === 'undefined'; },
        fnc: function(a) { return typeof a === 'function' }
    };

    function stringToHyphens(str) {
        return str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
    }

    function getCSSValue(el, prop) {
        if (prop in el.style) {
            return getComputedStyle(el).getPropertyValue(stringToHyphens(prop)) || '0';
        }
    }

    var t = 'transform';
    var transformProperty = (getCSSValue(document.body, t) ? t : '-webkit-' + t);

    function buildSlide(value) {
        return '<li class="ms-slide">' + value + '</li>';
    }

    function extendSingle(target, source) {
        for (var key in source)
            target[key] = is.arr(source[key]) ? source[key].slice(0) : source[key];
        return target;
    }

    function extend(target) {
        if (!target) target = {};
        for (var i = 1; i < arguments.length; i++)
            extendSingle(target, arguments[i]);
        return target;
    }

    function animate(step, duration, easing) {
        if (duration) {
            var start = performance.now();
            var timer = null;
            var stopped = false;
            var animation = function (t) {
                var progress = (t - start) / duration;
                if (progress < 0) progress = 0;
                if (progress > 1) progress = 1;
                if (is.fnc(easing)) progress = easing(progress);
                step(progress);
                if (progress !== 1 && !stopped) timer = requestAnimationFrame(animation);
            };
            timer = requestAnimationFrame(animation);
            return new function() {
                this.stop = function() {
                    if (timer) cancelAnimationFrame(timer);
                    stopped = true;
                };
            };
        } else {
            step(1);
        }
    }

    /* eslint-disable */
    function getPassiveSupported() {
        var passiveSupported = false;
        try {
            var options = Object.defineProperty({}, 'passive', {
                get: function get() {
                    passiveSupported = true;
                }
            });

            window.addEventListener('test', null, options);
        } catch (err) {}
        getPassiveSupported = function () {
            return passiveSupported;
        };
        return passiveSupported;
    }
    /* eslint-enable */

    function normalizeEvent(ev) {
        if (ev.type === 'touchmove' || ev.type === 'touchstart' || ev.type === 'touchend') {
            var touch = ev.targetTouches[0] || ev.changedTouches[0];
            return {
                x: touch.clientX,
                y: touch.clientY,
                id: touch.identifier
            };
        } else {
            return {
                x: ev.clientX,
                y: ev.clientY,
                id: null
            };
        }
    }

    function dragOutOfBoundsMultiplier(val) {
        return 0.000005 * Math.pow(val, 2) + 0.0001 * val + 0.55;
    }

    function getCurrentValue(values, diff, lower) {
        var lowerValue = values[0];
        var centerValue = values[1];
        var higherValue = values[2] || lowerValue;
        var diffValue = lower ? centerValue - lowerValue : centerValue - higherValue;
        return lower ? centerValue - diffValue * diff : centerValue + diffValue * diff;
    }

    return extend(MomentumSlider, {
        extend: extend,
        transformProperty: transformProperty,
        getCurrentValue: getCurrentValue
    });

})));
