/**
 * Well known colors for a NeoPixel strip
 */
enum NeoPixelColors {
    //% block=Rouge
    Red = 0xFF0000,
    //% block=Orange
    Orange = 0xFF3A00,
    //% block=Jaune
    Yellow = 0xFF8A00,
    //% block=Vert
    Green = 0x00FF00,
    //% block=Bleu
    Blue = 0x0000FF,
    //% block=Violet
    Indigo = 0x5B00FF,
    //% block=Rose
    Purple = 0xFF00FF,
    //% block=Blanc
    White = 0xFFFFFF,
    //% block=Noir
    Black = 0x000000
}

/**
 * Different modes for RGB or RGB+W NeoPixel strips
 */
enum NeoPixelMode {
    //% block="RGB (GRB format)"
    RGB = 1,
    //% block="RGB+W"
    RGBW = 2,
    //% block="RGB (RGB format)"
    RGB_RGB = 3
}

/**
 * Functions to operate NeoPixel strips.
 */
//% weight=5 color=#0000FF icon="\uf110"
namespace Anneau_LED {
    /**
     * A NeoPixel strip
     */
    export class Strip {
        buf: Buffer;
        pin: DigitalPin;
        // TODO: encode as bytes instead of 32bit
        brightness: number;
        start: number; // start offset in LED strip
        _length: number; // number of LEDs
        _mode: NeoPixelMode;
        _matrixWidth: number; // number of leds in a matrix - if any

        /**
         * Shows all LEDs to a given color (range 0-255 for r, g, b).
         * @param rgb RGB color of the LED
         */
        //% blockId="neopixel_set_strip_color" block="montrer sur %strip|la couleur %rgb=neopixel_colors"
        //% strip.defl=strip
        //% weight=85 blockGap=8
        //% parts="neopixel"
        showColor(rgb: number) {
            rgb = rgb >> 0;
            this.setAllRGB(rgb);
            this.show();
        }

        /**
         * Shows a rainbow pattern on all LEDs.
         * @param startHue the start hue value for the rainbow, eg: 1
         * @param endHue the end hue value for the rainbow, eg: 360
         */
        //% blockId="neopixel_set_strip_rainbow" block="afficher arc-en-ciel sur %strip|de %startHue|à %endHue"
        //% strip.defl=strip
        //% weight=85 blockGap=8
        //% parts="neopixel"
        showRainbow(startHue: number = 1, endHue: number = 360) {
            if (this._length <= 0) return;

            startHue = startHue >> 0;
            endHue = endHue >> 0;
            const saturation = 100;
            const luminance = 50;
            const steps = this._length;
            const direction = HueInterpolationDirection.Clockwise;

            //hue
            const h1 = startHue;
            const h2 = endHue;
            const hDistCW = ((h2 + 360) - h1) % 360;
            const hStepCW = Math.idiv((hDistCW * 100), steps);
            const hDistCCW = ((h1 + 360) - h2) % 360;
            const hStepCCW = Math.idiv(-(hDistCCW * 100), steps);
            let hStep: number;
            if (direction === HueInterpolationDirection.Clockwise) {
                hStep = hStepCW;
            } else if (direction === HueInterpolationDirection.CounterClockwise) {
                hStep = hStepCCW;
            } else {
                hStep = hDistCW < hDistCCW ? hStepCW : hStepCCW;
            }
            const h1_100 = h1 * 100; //we multiply by 100 so we keep more accurate results while doing interpolation

            //sat
            const s1 = saturation;
            const s2 = saturation;
            const sDist = s2 - s1;
            const sStep = Math.idiv(sDist, steps);
            const s1_100 = s1 * 100;

            //lum
            const l1 = luminance;
            const l2 = luminance;
            const lDist = l2 - l1;
            const lStep = Math.idiv(lDist, steps);
            const l1_100 = l1 * 100

            //interpolate
            if (steps === 1) {
                this.setPixelColor(0, hsl(h1 + hStep, s1 + sStep, l1 + lStep))
            } else {
                this.setPixelColor(0, hsl(startHue, saturation, luminance));
                for (let i = 1; i < steps - 1; i++) {
                    const h = Math.idiv((h1_100 + i * hStep), 100) + 360;
                    const s = Math.idiv((s1_100 + i * sStep), 100);
                    const l = Math.idiv((l1_100 + i * lStep), 100);
                    this.setPixelColor(i, hsl(h, s, l));
                }
                this.setPixelColor(steps - 1, hsl(endHue, saturation, luminance));
            }
            this.show();
        }

        /**
         * Displays a vertical bar graph based on the `value` and `high` value.
         * If `high` is 0, the chart gets adjusted automatically.
         * @param value current value to plot
         * @param high maximum value, eg: 255
         */
        //% weight=84
        //% blockId=neopixel_show_bar_graph block="montrer un bargraph sur %strip|de %value|jusqu'à %high"
        //% strip.defl=strip
        //% icon="\uf080"
        //% parts="neopixel"
        showBarGraph(value: number, high: number): void {
            if (high <= 0) {
                this.clear();
                this.setPixelColor(0, NeoPixelColors.Yellow);
                this.show();
                return;
            }

            value = Math.abs(value);
            const n = this._length;
            const n1 = n - 1;
            let v = Math.idiv((value * n), high);
            if (v == 0) {
                this.setPixelColor(0, 0x666600);
                for (let i = 1; i < n; ++i)
                    this.setPixelColor(i, 0);
            } else {
                for (let i = 0; i < n; ++i) {
                    if (i <= v) {
                        const b = Math.idiv(i * 255, n1);
                        this.setPixelColor(i, Anneau_LED.rgb(b, 0, 255 - b));
                    }
                    else this.setPixelColor(i, 0);
                }
            }
            this.show();
        }

        /**
         * Set LED to a given color (range 0-255 for r, g, b).
         * You need to call ``show`` to make the changes visible.
         * @param pixeloffset position of the NeoPixel in the strip
         * @param rgb RGB color of the LED
         */
        //% blockId="neopixel_set_pixel_color" block="set pixel sur %strip|à %pixeloffset|en %rgb=neopixel_colors"
        //% strip.defl=strip
        //% blockGap=8
        //% weight=80
        //% parts="neopixel" advanced=true
        setPixelColor(pixeloffset: number, rgb: number): void {
            this.setPixelRGB(pixeloffset >> 0, rgb >> 0);
        }

        /**
         * Sets the number of pixels in a matrix shaped strip
         * @param width number of pixels in a row
         */
        //% blockId=neopixel_set_matrix_width block="sur %strip|mettre la lageur de la matrice à %width"
        //% strip.defl=strip
        //% blockGap=8
        //% weight=5
        //% parts="neopixel" advanced=true
        setMatrixWidth(width: number) {
            this._matrixWidth = Math.min(this._length, width >> 0);
        }

        /**
         * Set LED to a given color (range 0-255 for r, g, b) in a matrix shaped strip
         * You need to call ``show`` to make the changes visible.
         * @param x horizontal position
         * @param y horizontal position
         * @param rgb RGB color of the LED
         */
        //% blockId="neopixel_set_matrix_color" block="montrer sur %strip|à x %x|y %y|en %rgb=neopixel_colors"
        //% strip.defl=strip
        //% weight=4
        //% parts="neopixel" advanced=true
        setMatrixColor(x: number, y: number, rgb: number) {
            if (this._matrixWidth <= 0) return; // not a matrix, ignore
            x = x >> 0;
            y = y >> 0;
            rgb = rgb >> 0;
            const cols = Math.idiv(this._length, this._matrixWidth);
            if (x < 0 || x >= this._matrixWidth || y < 0 || y >= cols) return;
            let i = x + y * this._matrixWidth;
            this.setPixelColor(i, rgb);
        }

        /**
         * Send all the changes to the strip.
         */
        //% blockId="neopixel_show" block="montrer %strip" blockGap=8
        //% strip.defl=strip
        //% weight=79
        //% parts="neopixel"
        show() {
            // only supported in beta
            // ws2812b.setBufferMode(this.pin, this._mode);
            ws2812b.sendBuffer(this.buf, this.pin);
        }

        /**
         * Turn off all LEDs.
         * You need to call ``show`` to make the changes visible.
         */
        //% blockId="neopixel_clear" block="%strip|clear"
        //% strip.defl=strip
        //% weight=76
        //% parts="neopixel"
        clear(): void {
            const stride = this._mode === NeoPixelMode.RGBW ? 4 : 3;
            this.buf.fill(0, this.start * stride, this._length * stride);
        }

        /**
         * Gets the number of pixels declared on the strip
         */
        //% blockId="neopixel_length" block="longeur de %strip" blockGap=8
        //% strip.defl=strip
        //% weight=60 advanced=true
        length() {
            return this._length;
        }

        /**
         * Set the brightness of the strip. This flag only applies to future operation.
         * @param brightness a measure of LED brightness in 0-255. eg: 255
         */
        //% blockId="neopixel_set_brightness" block="sur %strip|luminosité à %brightness" blockGap=8
        //% strip.defl=strip
        //% weight=59
        //% parts="neopixel" advanced=true
        setBrightness(brightness: number): void {
            this.brightness = brightness & 0xff;
        }

        /**
         * Apply brightness to current colors using a quadratic easing function.
         **/
        //% blockId="neopixel_each_brightness" block="sur %strip|luminosité automatique" blockGap=8
        //% strip.defl=strip
        //% weight=58
        //% parts="neopixel" advanced=true
        easeBrightness(): void {
            const stride = this._mode === NeoPixelMode.RGBW ? 4 : 3;
            const br = this.brightness;
            const buf = this.buf;
            const end = this.start + this._length;
            const mid = Math.idiv(this._length, 2);
            for (let i = this.start; i < end; ++i) {
                const k = i - this.start;
                const ledoffset = i * stride;
                const br = k > mid
                    ? Math.idiv(255 * (this._length - 1 - k) * (this._length - 1 - k), (mid * mid))
                    : Math.idiv(255 * k * k, (mid * mid));
                const r = (buf[ledoffset + 0] * br) >> 8; buf[ledoffset + 0] = r;
                const g = (buf[ledoffset + 1] * br) >> 8; buf[ledoffset + 1] = g;
                const b = (buf[ledoffset + 2] * br) >> 8; buf[ledoffset + 2] = b;
                if (stride == 4) {
                    const w = (buf[ledoffset + 3] * br) >> 8; buf[ledoffset + 3] = w;
                }
            }
        }

        /**
         * Create a range of LEDs.
         * @param start offset in the LED strip to start the range
         * @param length number of LEDs in the range. eg: 4
         */
        //% weight=89
        //% blockId="neopixel_range" block="sur %strip|gamme de %start|avec %length|leds"
        //% strip.defl=strip
        //% parts="neopixel"
        //% blockSetVariable=range
        range(start: number, length: number): Strip {
            start = start >> 0;
            length = length >> 0;
            let strip = new Strip();
            strip.buf = this.buf;
            strip.pin = this.pin;
            strip.brightness = this.brightness;
            strip.start = this.start + Math.clamp(0, this._length - 1, start);
            strip._length = Math.clamp(0, this._length - (strip.start - this.start), length);
            strip._matrixWidth = 0;
            strip._mode = this._mode;
            return strip;
        }

        /**
         * Shift LEDs forward and clear with zeros.
         * You need to call ``show`` to make the changes visible.
         * @param offset number of pixels to shift forward, eg: 1
         */
        //% blockId="neopixel_shift" block="sur %strip|décaler de %offset" blockGap=8
        //% strip.defl=strip
        //% weight=40
        //% parts="neopixel"
        shift(offset: number = 1): void {
            offset = offset >> 0;
            const stride = this._mode === NeoPixelMode.RGBW ? 4 : 3;
            this.buf.shift(-offset * stride, this.start * stride, this._length * stride)
        }

        /**
         * Rotate LEDs forward.
         * You need to call ``show`` to make the changes visible.
         * @param offset number of pixels to rotate forward, eg: 1
         */
        //% blockId="neopixel_rotate" block="sur %strip|tourner de %offset" blockGap=8
        //% strip.defl=strip
        //% weight=39
        //% parts="neopixel"
        rotate(offset: number = 1): void {
            offset = offset >> 0;
            const stride = this._mode === NeoPixelMode.RGBW ? 4 : 3;
            this.buf.rotate(-offset * stride, this.start * stride, this._length * stride)
        }

        /**
         * Set the pin where the neopixel is connected, defaults to P0.
         */
        //% weight=10
        //% parts="neopixel" advanced=true
        setPin(pin: DigitalPin): void {
            this.pin = pin;
            pins.digitalWritePin(this.pin, 0);
            // don't yield to avoid races on initialization
        }

        /**
         * Estimates the electrical current (mA) consumed by the current light configuration.
         */
        //% weight=9 blockId=neopixel_power block="%strip|puissance (mA)"
        //% strip.defl=strip
        //% advanced=true
        power(): number {
            const stride = this._mode === NeoPixelMode.RGBW ? 4 : 3;
            const end = this.start + this._length;
            let p = 0;
            for (let i = this.start; i < end; ++i) {
                const ledoffset = i * stride;
                for (let j = 0; j < stride; ++j) {
                    p += this.buf[i + j];
                }
            }
            return Math.idiv(this.length() * 7, 10) /* 0.7mA per neopixel */
                + Math.idiv(p * 480, 10000); /* rought approximation */
        }

        private setBufferRGB(offset: number, red: number, green: number, blue: number): void {
            if (this._mode === NeoPixelMode.RGB_RGB) {
                this.buf[offset + 0] = red;
                this.buf[offset + 1] = green;
            } else {
                this.buf[offset + 0] = green;
                this.buf[offset + 1] = red;
            }
            this.buf[offset + 2] = blue;
        }

        private setAllRGB(rgb: number) {
            let red = unpackR(rgb);
            let green = unpackG(rgb);
            let blue = unpackB(rgb);

            const br = this.brightness;
            if (br < 255) {
                red = (red * br) >> 8;
                green = (green * br) >> 8;
                blue = (blue * br) >> 8;
            }
            const end = this.start + this._length;
            const stride = this._mode === NeoPixelMode.RGBW ? 4 : 3;
            for (let i = this.start; i < end; ++i) {
                this.setBufferRGB(i * stride, red, green, blue)
            }
        }
        private setAllW(white: number) {
            if (this._mode !== NeoPixelMode.RGBW)
                return;

            let br = this.brightness;
            if (br < 255) {
                white = (white * br) >> 8;
            }
            let buf = this.buf;
            let end = this.start + this._length;
            for (let i = this.start; i < end; ++i) {
                let ledoffset = i * 4;
                buf[ledoffset + 3] = white;
            }
        }
        private setPixelRGB(pixeloffset: number, rgb: number): void {
            if (pixeloffset < 0
                || pixeloffset >= this._length)
                return;

            let stride = this._mode === NeoPixelMode.RGBW ? 4 : 3;
            pixeloffset = (pixeloffset + this.start) * stride;

            let red = unpackR(rgb);
            let green = unpackG(rgb);
            let blue = unpackB(rgb);

            let br = this.brightness;
            if (br < 255) {
                red = (red * br) >> 8;
                green = (green * br) >> 8;
                blue = (blue * br) >> 8;
            }
            this.setBufferRGB(pixeloffset, red, green, blue)
        }
        private setPixelW(pixeloffset: number, white: number): void {
            if (this._mode !== NeoPixelMode.RGBW)
                return;

            if (pixeloffset < 0
                || pixeloffset >= this._length)
                return;

            pixeloffset = (pixeloffset + this.start) * 4;

            let br = this.brightness;
            if (br < 255) {
                white = (white * br) >> 8;
            }
            let buf = this.buf;
            buf[pixeloffset + 3] = white;
        }
    }

    /**
     * Create a new NeoPixel driver for `numleds` LEDs.
     * @param pin the pin where the neopixel is connected.
     * @param numleds number of leds in the strip, eg: 24,30,60,64
     */
    //% blockId="neopixel_create" block="NeoPixel à la pin %pin|avec %numleds|leds"
    //% weight=90 blockGap=8
    //% parts="neopixel"
    //% trackArgs=0,2
    //% blockSetVariable=strip
    export function create(pin: DigitalPin, numleds: number): Strip {
        let strip = new Strip();
        let stride = 1 === NeoPixelMode.RGBW ? 4 : 3;
        strip.buf = pins.createBuffer(numleds * stride);
        strip.start = 0;
        strip._length = numleds;
        strip._mode = 1 || NeoPixelMode.RGB;
        strip._matrixWidth = 0;
        strip.setBrightness(128)
        strip.setPin(pin)
        return strip;
    }

    /**
     * Converts red, green, blue channels into a RGB color
     * @param red value of the red channel between 0 and 255. eg: 255
     * @param green value of the green channel between 0 and 255. eg: 255
     * @param blue value of the blue channel between 0 and 255. eg: 255
     */
    //% weight=1
    //% blockId="neopixel_rgb" block="Rouge %red|Vert %green|Bleu %blue"
    //% red.min=0 red.max=255
    //% green.min=0 green.max=255
    //% blue.min=0 blue.max=255
    //% advanced=true
    export function rgb(red: number, green: number, blue: number): number {
        return packRGB(red, green, blue);
    }

    /**
     * Gets the RGB value of a known color
    */
    //% weight=2 blockGap=8
    //% blockId="neopixel_colors" block="%color"
    //% advanced=true
    export function colors(color: NeoPixelColors): number {
        return color;
    }

    function packRGB(a: number, b: number, c: number): number {
        return ((a & 0xFF) << 16) | ((b & 0xFF) << 8) | (c & 0xFF);
    }
    function unpackR(rgb: number): number {
        let r = (rgb >> 16) & 0xFF;
        return r;
    }
    function unpackG(rgb: number): number {
        let g = (rgb >> 8) & 0xFF;
        return g;
    }
    function unpackB(rgb: number): number {
        let b = (rgb) & 0xFF;
        return b;
    }

    /**
     * Converts a hue saturation luminosity value into a RGB color
     * @param h hue from 0 to 360
     * @param s saturation from 0 to 99
     * @param l luminosity from 0 to 99
     */
    //% blockId=neopixelHSL block="teinte %h|saturation %s|luminosité %l"
    export function hsl(h: number, s: number, l: number): number {
        h = Math.round(h);
        s = Math.round(s);
        l = Math.round(l);

        h = h % 360;
        s = Math.clamp(0, 99, s);
        l = Math.clamp(0, 99, l);
        let c = Math.idiv((((100 - Math.abs(2 * l - 100)) * s) << 8), 10000); //chroma, [0,255]
        let h1 = Math.idiv(h, 60);//[0,6]
        let h2 = Math.idiv((h - h1 * 60) * 256, 60);//[0,255]
        let temp = Math.abs((((h1 % 2) << 8) + h2) - 256);
        let x = (c * (256 - (temp))) >> 8;//[0,255], second largest component of this color
        let r$: number;
        let g$: number;
        let b$: number;
        if (h1 == 0) {
            r$ = c; g$ = x; b$ = 0;
        } else if (h1 == 1) {
            r$ = x; g$ = c; b$ = 0;
        } else if (h1 == 2) {
            r$ = 0; g$ = c; b$ = x;
        } else if (h1 == 3) {
            r$ = 0; g$ = x; b$ = c;
        } else if (h1 == 4) {
            r$ = x; g$ = 0; b$ = c;
        } else if (h1 == 5) {
            r$ = c; g$ = 0; b$ = x;
        }
        let m = Math.idiv((Math.idiv((l * 2 << 8), 100) - c), 2);
        let r = r$ + m;
        let g = g$ + m;
        let b = b$ + m;
        return packRGB(r, g, b);
    }

    export enum HueInterpolationDirection {
        Clockwise,
        CounterClockwise,
        Shortest
    }
}


//% color="#FFAB00" weight=100 icon="\uf29d"
namespace distance {
    let i2cAddr = 0x29;
    let setting: number[] = []

    function writeRegister16(regAddr: number, value: number) {
        let buffer = pins.createBuffer(3);
        buffer[0] = (regAddr >> 8) & 0xFF; // MSB
        buffer[1] = regAddr & 0xFF;       // LSB
        buffer[2] = value & 0xFF;         // Valeur
        pins.i2cWriteBuffer(i2cAddr, buffer);
    }

    function readRegister(regAddr: number, octet: number): Buffer {
        let buffer = pins.createBuffer(2);
        buffer[0] = (regAddr >> 8) & 0xFF; // MSB
        buffer[1] = regAddr & 0xFF;       // LSB
        pins.i2cWriteBuffer(i2cAddr, buffer);
        return pins.i2cReadBuffer(i2cAddr, octet);
    }
    
    function getID(): number {
        let result = readRegister(0x010F, 1); //retoune 0xEB = 235
        return (result[0]);
    }


    //% block="initalisation distance"
    export function initalisation_distance() {
        pins.digitalWritePin(DigitalPin.P15, 1)
        pins.setPull(DigitalPin.P1, PinPullMode.PullUp)
        while (getID() != 235) {
            writeRegister16(0x0000, 0x01); // Soft reset
            basic.pause(100); // Attendre que le capteur redémarre

        }

        writeRegister16(0x2E, 0x01);        // "0x2e : bit 0 if I2C pulled up at 1.8V, else set bit 0 to 1 (pull up at AVDD)"
        writeRegister16(0x2F, 0x01);        // "0x2f : bit 0 if GPIO pulled up at 1.8V, else set bit 0 to 1 (pull up at AVDD)"

        setting =
            [
                0x11, /* 0x30 : set bit 4 to 0 for active high interrupt and 1 for active low
    (bits 3:0 must be 0x1), use SetInterruptPolarity() */
                0x02, /* 0x31 : bit 1 = interrupt depending on the polarity,
    use CheckForDataReady() */
                0x00, /* 0x32 : not user-modifiable */
                0x02, /* 0x33 : not user-modifiable */
                0x08, /* 0x34 : not user-modifiable */
                0x00, /* 0x35 : not user-modifiable */
                0x08, /* 0x36 : not user-modifiable */
                0x10, /* 0x37 : not user-modifiable */
                0x01, /* 0x38 : not user-modifiable */
                0x01, /* 0x39 : not user-modifiable */
                0x00, /* 0x3a : not user-modifiable */
                0x00, /* 0x3b : not user-modifiable */
                0x00, /* 0x3c : not user-modifiable */
                0x00, /* 0x3d : not user-modifiable */
                0xff, /* 0x3e : not user-modifiable */
                0x00, /* 0x3f : not user-modifiable */
                0x0F, /* 0x40 : not user-modifiable */
                0x00, /* 0x41 : not user-modifiable */
                0x00, /* 0x42 : not user-modifiable */
                0x00, /* 0x43 : not user-modifiable */
                0x00, /* 0x44 : not user-modifiable */
                0x00, /* 0x45 : not user-modifiable */
                0x20, /* 0x46 : interrupt configuration 0->level low detection, 1-> level high,
    2-> Out of window, 3->In window, 0x20-> New sample ready , TBC */
                0x0b, /* 0x47 : not user-modifiable */
                0x00, /* 0x48 : not user-modifiable */
                0x00, /* 0x49 : not user-modifiable */
                0x02, /* 0x4a : not user-modifiable */
                0x14, /* 0x4b : not user-modifiable */
                0x21, /* 0x4c : not user-modifiable */
                0x00, /* 0x4d : not user-modifiable */
                0x00, /* 0x4e : not user-modifiable */
                0x05, /* 0x4f : not user-modifiable */
                0x00, /* 0x50 : not user-modifiable */
                0x00, /* 0x51 : not user-modifiable */
                0x00, /* 0x52 : not user-modifiable */
                0x00, /* 0x53 : not user-modifiable */
                0xc8, /* 0x54 : not user-modifiable */
                0x00, /* 0x55 : not user-modifiable */
                0x00, /* 0x56 : not user-modifiable */
                0x38, /* 0x57 : not user-modifiable */
                0xff, /* 0x58 : not user-modifiable */
                0x01, /* 0x59 : not user-modifiable */
                0x00, /* 0x5a : not user-modifiable */
                0x08, /* 0x5b : not user-modifiable */
                0x00, /* 0x5c : not user-modifiable */
                0x00, /* 0x5d : not user-modifiable */
                0x01, /* 0x5e : not user-modifiable */
                0xcc, /* 0x5f : not user-modifiable */
                0x07, /* 0x60 : not user-modifiable */
                0x01, /* 0x61 : not user-modifiable */
                0xf1, /* 0x62 : not user-modifiable */
                0x05, /* 0x63 : not user-modifiable */
                0x00, /* 0x64 : Sigma threshold MSB (mm in 14.2 format for MSB+LSB),
    use SetSigmaThreshold(), default value 90 mm  */
                0xa0, /* 0x65 : Sigma threshold LSB */
                0x00, /* 0x66 : Min count Rate MSB (MCPS in 9.7 format for MSB+LSB),
    use SetSignalThreshold() */
                0x80, /* 0x67 : Min count Rate LSB */
                0x08, /* 0x68 : not user-modifiable */
                0x38, /* 0x69 : not user-modifiable */
                0x00, /* 0x6a : not user-modifiable */
                0x00, /* 0x6b : not user-modifiable */
                0x00, /* 0x6c : Intermeasurement period MSB, 32 bits register,
    use SetIntermeasurementInMs() */
                0x00, /* 0x6d : Intermeasurement period */
                0x0f, /* 0x6e : Intermeasurement period */
                0x89, /* 0x6f : Intermeasurement period LSB */
                0x00, /* 0x70 : not user-modifiable */
                0x00, /* 0x71 : not user-modifiable */
                0x00, /* 0x72 : distance threshold high MSB (in mm, MSB+LSB),
    use SetD:tanceThreshold() */
                0x00, /* 0x73 : distance threshold high LSB */
                0x00, /* 0x74 : distance threshold low MSB ( in mm, MSB+LSB),
    use SetD:tanceThreshold() */
                0x00, /* 0x75 : distance threshold low LSB */
                0x00, /* 0x76 : not user-modifiable */
                0x01, /* 0x77 : not user-modifiable */
                0x07, /* 0x78 : not user-modifiable */
                0x05, /* 0x79 : not user-modifiable */
                0x06, /* 0x7a : not user-modifiable */
                0x06, /* 0x7b : not user-modifiable */
                0x00, /* 0x7c : not user-modifiable */
                0x00, /* 0x7d : not user-modifiable */
                0x02, /* 0x7e : not user-modifiable */
                0xc7, /* 0x7f : not user-modifiable */
                0xff, /* 0x80 : not user-modifiable */
                0x9B, /* 0x81 : not user-modifiable */
                0x00, /* 0x82 : not user-modifiable */
                0x00, /* 0x83 : not user-modifiable */
                0x00, /* 0x84 : not user-modifiable */
                0x01, /* 0x85 : not user-modifiable */
                0x00, /* 0x86 : clear interrupt, use ClearInterrupt() */
                0x40  /* 0x87 : start ranging, If you want an automatic start after init() call,
      put 0x40 in location 0x87 */
            ]

        for (let i = 0x30; i <= 0x87; i++) {
            writeRegister16(i, setting[i - 0x30]);
            basic.pause(10);
        }


    }

    // note that Caml casing yields lower case
    // block text with spaces

    //% block="distance en mm"
    export function distance_en_mm(): number {
        let result = readRegister(0x96, 2);
        return (result[0] << 8) | result[1];
    }
}


//% weight=5 color=#63A4A2 icon="\uf032"
namespace affichage {
    let display = Anneau_LED.create(DigitalPin.P2, 35)
    let nbWidth = [4, 2, 4, 4, 4, 4, 4, 4, 4, 4]; // Largeur de la matrice en LEDs
    let charwidth = [4, 4, 4, 4, 4, 4, 4, 4, 2, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4];    
    let scrollSpeed = 300; // Temps entre chaque décalage 
    display.clear();
    display.show();



    // Définition des chiffres (LEDs allumées pour chaque chiffre)
    let numbers = [
        [1, 2, 3, 5, 9, 10, 13, 14, 15, 17, 19, 20, 21, 24, 25, 29, 31, 32, 33],  // 0
        [4, 8, 9, 12, 14, 19, 24, 29, 34],                                // 1
        [1, 2, 3, 5, 9, 14, 18, 22, 26, 30, 31, 32, 33, 34],      // 2
        [1, 2, 3, 5, 9, 14, 17, 18, 24, 25, 29, 31, 32, 33],      // 3 
        [3, 7, 8, 11, 13, 15, 18, 20, 21, 22, 23, 24, 28, 33],            // 4
        [0, 1, 2, 3, 4, 5, 10, 11, 12, 13, 19, 24, 25, 29, 31, 32, 33],      // 5
        [1, 2, 3, 5, 9, 10, 15, 16, 17, 18, 20, 24, 25, 29, 31, 32, 33],  // 6
        [0, 1, 2, 3, 4, 5, 9, 13, 17, 22, 27, 32],                      // 7
        [1, 2, 3, 5, 9, 10, 14, 16, 17, 18, 20, 24, 25, 29, 31, 32, 33], // 8
        [1, 2, 3, 5, 9, 10, 14, 16, 17, 18, 19, 24, 25, 29, 31, 32, 33]  // 9
    ];

    let charMap = [
    /* A */[2, 6, 8, 10, 14, 15, 19, 20, 21, 22, 23, 24, 25, 29, 30, 34],
    /* B */[1, 2, 3, 5, 9, 10, 14, 15, 16, 17, 18, 20, 24, 25, 29, 31, 32, 33],
    /* C */[1, 2, 3, 5, 9, 10, 15, 20, 25, 29, 31, 32, 33],
    /* D */[0, 1, 2, 5, 8, 10, 14, 15, 19, 20, 24, 25, 29, 30, 31, 32, 33],
    /* E */[0, 1, 2, 3, 4, 5, 10, 15, 16, 17, 18, 20, 25, 30, 31, 32, 33, 34],
    /* F */[0, 1, 2, 3, 4, 5, 10, 15, 16, 17, 18, 20, 25, 30],
    /* G */[1, 2, 3, 5, 9, 10, 15, 17, 18, 19, 20, 24, 25, 29, 31, 32, 33],
    /* H */[0, 4, 5, 9, 10, 14, 15, 16, 17, 18, 19, 20, 24, 25, 29, 30, 34],
    /* I */[2, 3, 4, 8, 13, 18, 23, 28, 32, 33, 34],
    /* J */[2, 3, 4, 8, 13, 18, 20, 23, 25, 28, 31, 32],
    /* K */[0, 4, 5, 8, 10, 12, 15, 16, 20, 22, 25, 28, 30, 34],
    /* L */[0, 5, 10, 15, 20, 25, 30, 31, 32, 33, 34],
    /* M */[0, 4, 5, 6, 8, 9, 10, 12, 14, 15, 17, 19, 20, 24, 25, 29, 30, 34],
    /* N */[0, 4, 5, 9, 10, 11, 14, 15, 17, 19, 20, 23, 24, 25, 29, 30, 34],
    /* O */[1, 2, 3, 5, 9, 10, 14, 15, 19, 20, 24, 25, 29, 31, 32, 33],
    /* P */[0, 1, 2, 3, 5, 9, 10, 14, 15, 16, 17, 18, 20, 25, 30],
    /* Q */[1, 2, 3, 5, 9, 10, 14, 15, 19, 20, 22, 24, 25, 28, 29, 31, 32, 33],
    /* R */[0, 1, 2, 3, 5, 9, 10, 14, 15, 16, 17, 18, 20, 22, 25, 28, 30, 34],
    /* S */[1, 2, 3, 5, 9, 10, 16, 17, 18, 24, 25, 29, 31, 32, 33],
    /* T */[0, 1, 2, 3, 4, 7, 12, 17, 22, 27, 32],
    /* U */[0, 4, 5, 9, 10, 14, 15, 19, 20, 24, 25, 29, 31, 32, 33],
    /* V */[0, 4, 5, 9, 10, 14, 15, 19, 20, 24, 26, 28, 32],
    /* W */[0, 4, 5, 9, 10, 14, 15, 17, 19, 20, 22, 24, 25, 27, 29, 31, 33],
    /* X */[0, 4, 5, 9, 11, 13, 17, 21, 23, 25, 29, 30, 34],
    /* Y */[0, 4, 5, 9, 10, 14, 16, 18, 22, 27, 32],
    /* Z */[0, 1, 2, 3, 4, 9, 13, 17, 21, 25, 30, 31, 32, 33, 34]
    ];



    function shift() {
        
        display.show();
        display.setPixelColor(0, Anneau_LED.colors(NeoPixelColors.Black));
        display.setPixelColor(5, Anneau_LED.colors(NeoPixelColors.Black));
        display.setPixelColor(10, Anneau_LED.colors(NeoPixelColors.Black));
        display.setPixelColor(15, Anneau_LED.colors(NeoPixelColors.Black));
        display.setPixelColor(20, Anneau_LED.colors(NeoPixelColors.Black));
        display.setPixelColor(25, Anneau_LED.colors(NeoPixelColors.Black));
        display.setPixelColor(30, Anneau_LED.colors(NeoPixelColors.Black));
        display.shift(-1);
        basic.pause(scrollSpeed / 2);
        display.show();
        basic.pause(scrollSpeed / 2);
        
    }

    //% block="affiche %text| stable en %rgb=neopixel_colors"
    export function affiche(text: string, rgb: number) {
        display.clear()
        for (let l = 0; l <= text.length - 1; l++) {
            // Convertir en majuscule
            let char = text[l].toUpperCase();
            let charIndex = char.charCodeAt(0) - 65
            // Récupère la forme de la lettre
            let letterPixels = charMap[charIndex]
            for (let index of letterPixels) {
                display.setPixelColor(index, Anneau_LED.colors(rgb))
            }
            display.show()
        }
        basic.pause(1000)
        display.clear()
        display.show()
    }





    // Fonction pour faire défiler un nombre de droite à gauche
    //% block="affiche %num|en nombre en %rgb=neopixel_colors"
    export function scrollNumber(num: number, rgb: number) {
        let numStr = num.toString();

        for (let i = 0; i < numStr.length; i++) {
            let digit = parseInt(numStr[i]);
            for (let j = nbWidth[digit]; j >= 0; j--) {
                for (let index of numbers[digit]) {
                    let shiftedIndex = index + j;
                    if (shiftedIndex%5 == 4 ) {
                        display.setPixelColor(shiftedIndex, Anneau_LED.colors(rgb));
                    }
                }
                shift();
            }
            shift(); // Décale toute la matrice entre les caratère

        }
        for (let i = 0; i < 5; i++) {
            shift();
        }
        // Assurer que toutes les LED sont éteintes après le défilement
        display.clear();
        display.show();
    }



    // Fonction pour afficher du texte défilant
    //% block="affiche %text| en texte en %rgb=neopixel_colors"
    export function scrollText(text: string, rgb: number) {

        for (let i = 0; i < text.length; i++) {
            let char = text[i].toUpperCase(); // Convertir en majuscule 
            
            let charIndex = char.charCodeAt(0)
            
            if (charIndex == 32)            // si un espace est mit
            {
                for (let i = 0; i < 2; i++) {
                    shift();
                }
            }
            else if (charIndex<58 && charIndex>47)              //entre 0 et 9
            {
                charIndex=charIndex-48;
                let letterPixels = numbers[charIndex]; // Récupère la forme de la lettre

                for (let j = nbWidth[charIndex]; j >= 0; j--) {
                    for (let index of letterPixels) {
                        let shiftedIndex = index + j;

                        if (shiftedIndex % 5 == 4) {
                            display.setPixelColor(shiftedIndex, Anneau_LED.colors(rgb));
                        }
                    }
                    shift(); // Décale toute la matrice
                }

            }
            else {
                charIndex = charIndex - 65; // Convertir 'A'-'Z' en 0-25
            
                let letterPixels = charMap[charIndex]; // Récupère la forme de la lettre

                for (let j = charwidth[charIndex]; j >= 0; j--) {
                    for (let index of letterPixels) {
                        let shiftedIndex = index + j;

                        if (shiftedIndex%5 == 4) {
                            display.setPixelColor(shiftedIndex, Anneau_LED.colors(rgb));
                        }
                    }
                    shift(); // Décale toute la matrice
                }
            }
            shift(); // Décale toute la matrice entre les caratère
        }
        for (let i = 0; i < 5; i++) {
            shift();
        }

        // Effacer après le défilement
        display.show();
    }


    //%block="vitesse %vitesse"
    //%vitesse.min=50 vitesse.max=500 vitesse.default=250
    export function vitesse(vitesse: number) {
        scrollSpeed = vitesse;

    }

    //%block="luminosité de l'affichage %luminosite %"
    //%luminosite.min=0 luminosite.max=100 luminosite.default=100
    export function luminosite(luminosite: number)
    {
        luminosite=luminosite*2.55;
        display.setBrightness(luminosite);
    }
/*
    //% block="afficher en %rgb=neopixel_colors"
    //%imageLiteral=1
    //% imageLiteralColumns=5
    //% imageLiteralRows=7
    export function montrer(matrice: string, rgb: number)
    {
        
        for(let i=0;i<35;i++)
        {
            if(matrice)
            {
                display.setPixelColor(i, Anneau_LED.colors(rgb));
            }
            else
            {
                display.setPixelColor(i, Anneau_LED.colors(NeoPixelColors.Black));
            }

        }

    }*/

}
