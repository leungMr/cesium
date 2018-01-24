define([
        '../Core/buildModuleUrl',
        '../Core/Color',
        '../Core/defineProperties',
        '../Core/destroyObject',
        '../Core/Ellipsoid',
        '../Shaders/PostProcessFilters/AmbientOcclusionGenerate',
        '../Shaders/PostProcessFilters/AmbientOcclusion',
        '../Shaders/PostProcessFilters/BlackAndWhite',
        '../Shaders/PostProcessFilters/BloomComposite',
        '../Shaders/PostProcessFilters/Brightness',
        '../Shaders/PostProcessFilters/ContrastBias',
        '../Shaders/PostProcessFilters/DepthOfField',
        '../Shaders/PostProcessFilters/DepthView',
        '../Shaders/PostProcessFilters/EdgeDetection',
        '../Shaders/PostProcessFilters/EightBit',
        '../Shaders/PostProcessFilters/FXAA',
        '../Shaders/PostProcessFilters/GaussianBlur1D',
        '../Shaders/PostProcessFilters/LensFlare',
        '../Shaders/PostProcessFilters/NightVision',
        '../Shaders/PostProcessFilters/Silhouette',
        '../Shaders/PostProcessFilters/SilhouetteComposite',
        '../Shaders/PostProcessFilters/TextureOverlay',
        '../ThirdParty/Shaders/FXAA3_11',
        './PostProcess',
        './PostProcessComposite',
        './PostProcessSampleMode'
    ], function(
        buildModuleUrl,
        Color,
        defineProperties,
        destroyObject,
        Ellipsoid,
        AmbientOcclusionGenerate,
        AmbientOcclusion,
        BlackAndWhite,
        BloomComposite,
        Brightness,
        ContrastBias,
        DepthOfField,
        DepthView,
        EdgeDetection,
        EightBit,
        FXAA,
        GaussianBlur1D,
        LensFlare,
        NightVision,
        Silhouette,
        SilhouetteComposite,
        TextureOverlay,
        FXAA3_11,
        PostProcess,
        PostProcessComposite,
        PostProcessSampleMode) {
    'use strict';

    /**
     * Contains functions for creating common post-process stages.
     *
     * @exports PostProcessLibrary
     */
    var PostProcessLibrary = {};

    function createBlur(name) {
        var delta = 1.0;
        var sigma = 2.0;
        var stepSize = 1.0;

        var blurShader = '#define USE_STEP_SIZE\n' + GaussianBlur1D;
        var blurX = new PostProcess({
            name : name + '_x_direction',
            fragmentShader : blurShader,
            uniformValues: {
                delta : delta,
                sigma : sigma,
                stepSize : stepSize,
                direction : 0.0
            },
            samplingMode : PostProcessSampleMode.LINEAR
        });
        var blurY = new PostProcess({
            name : name + '_y_direction',
            fragmentShader : blurShader,
            uniformValues: {
                delta : delta,
                sigma : sigma,
                stepSize : stepSize,
                direction : 1.0
            },
            samplingMode : PostProcessSampleMode.LINEAR
        });

        var uniforms = {};
        defineProperties(uniforms, {
            delta : {
                get : function() {
                    return blurX.uniformValues.delta;
                },
                set : function(value) {
                    var blurXUniforms = blurX.uniformValues;
                    var blurYUniforms = blurY.uniformValues;
                    blurXUniforms.delta = blurYUniforms.delta = value;
                }
            },
            sigma : {
                get : function() {
                    return blurX.uniformValues.sigma;
                },
                set : function(value) {
                    var blurXUniforms = blurX.uniformValues;
                    var blurYUniforms = blurY.uniformValues;
                    blurXUniforms.sigma = blurYUniforms.sigma = value;
                }
            },
            stepSize : {
                get : function() {
                    return blurX.uniformValues.stepSize;
                },
                set : function(value) {
                    var blurXUniforms = blurX.uniformValues;
                    var blurYUniforms = blurY.uniformValues;
                    blurXUniforms.stepSize = blurYUniforms.stepSize = value;
                }
            }
        });
        return new PostProcessComposite({
            name : name,
            processes : [blurX, blurY],
            uniformValues : uniforms
        });
    }

    /**
     * Creates a post-process stage that applies a Gaussian blur to the input texture. This stage is usually applied in conjunction with another stage.
     * <p>
     * This stage has the following uniforms: <code>delta</code>, <code>sigma</code>, and <code>stepSize</code>.
     * </p>
     * <p>
     * <code>delta</code> and <code>sigma</code> are used to compute the weights of a Gaussian filter. The equation is <code>exp((-0.5 * delta * delta) / (sigma * sigma))</code>.
     * The default value for <code>delta</code> is <code>1.0</code>. The default value for <code>sigma</code> is <code>2.0</code>.
     * <code>stepSize</code> is the distance to the next texel. The default is <code>1.0</code>.
     * </p>
     * @return {PostProcessComposite} A post-process stage that applies a Gaussian blur to the input texture.
     */
    PostProcessLibrary.createBlurStage = function() {
        return createBlur('czm_blur');
    };

    /**
     * Creates a post-process stage that applies a depth of field effect.
     * <p>
     * Depth of field simulates camera focus. Objects in the scene that are in focus
     * will be clear whereas objects not in focus will be blurred.
     * </p>
     * <p>
     * This stage has the following uniforms: <code>focalDistance</code>, <code>delta</code>, <code>sigma</code>, and <code>stepSize</code>.
     * </p>
     * <p>
     * <code>focalDistance</code> is the distance in meters from the camera to set the camera focus.
     * </p>
     * <p>
     * <code>delta</code>, <code>sigma</code>, and <code>stepSize</code> are the same properties as {@link PostProcessLibrary#createBlurStage}.
     * The blur is applied to the areas out of focus.
     * </p>
     * @return {PostProcessComposite} A post-process stage that applies a depth of field effect.
     */
    PostProcessLibrary.createDepthOfFieldStage = function() {
        var blur = createBlur('czm_depth_of_field_blur');
        var dof = new PostProcess({
            name : 'czm_depth_of_field_composite',
            fragmentShader : DepthOfField,
            uniformValues : {
                focalDistance : 5.0,
                blurTexture : blur.name
            }
        });

        var uniforms = {};
        defineProperties(uniforms, {
            focalDistance : {
                get : function() {
                    return dof.uniformValues.focalDistance;
                },
                set : function(value) {
                    dof.uniformValues.focalDistance = value;
                }
            },
            delta : {
                get : function() {
                    return blur.uniformValues.delta;
                },
                set : function(value) {
                    blur.uniformValues.delta = value;
                }
            },
            sigma : {
                get : function() {
                    return blur.uniformValues.sigma;
                },
                set : function(value) {
                    blur.uniformValues.sigma = value;
                }
            },
            stepSize : {
                get : function() {
                    return blur.uniformValues.stepSize;
                },
                set : function(value) {
                    blur.uniformValues.stepSize = value;
                }
            }
        });
        return new PostProcessComposite({
            name : 'czm_depth_of_field',
            processes : [blur, dof],
            executeInSeries : false,
            uniformValues : uniforms
        });
    };

    /**
     * Creates a post-process stage that applies a silhouette effect.
     * <p>
     * A silhouette effect highlights the edges of an object.
     * </p>
     * <p>
     * This stage has the following uniforms: <code>color</code> and <code>length</code>
     * </p>
     * <p>
     * <code>color</code> is the color of the highlighted edge. The default is {@link Color#BLACK}.
     * <code>length</code> is the length of the edges in pixels. The default is <code>0.5</code>.
     * </p>
     * @return {PostProcessComposite} A post-process stage that applies a silhouette effect.
     */
    PostProcessLibrary.createSilhouetteStage = function() {
        var silhouetteDepth = new PostProcess({
            name : 'czm_silhouette_depth',
            fragmentShader : Silhouette
        });
        var edgeDetection = new PostProcess({
            name : 'czm_silhouette_edge_detection',
            fragmentShader : EdgeDetection,
            uniformValues : {
                length : 0.5,
                color : Color.clone(Color.BLACK)
            }
        });
        var silhouetteGenerateProcess = new PostProcessComposite({
            name : 'czm_silhouette_generate',
            processes : [silhouetteDepth, edgeDetection]
        });
        var silhouetteProcess = new PostProcess({
            name : 'czm_silhouette_composite',
            fragmentShader : SilhouetteComposite,
            uniformValues : {
                silhouetteTexture : silhouetteGenerateProcess.name
            }
        });

        var uniforms = {};
        defineProperties(uniforms, {
            length : {
                get : function() {
                    return edgeDetection.uniformValues.length;
                },
                set : function(value) {
                    edgeDetection.uniformValues = value;
                }
            },
            color : {
                get : function() {
                    return edgeDetection.uniformValues.color;
                },
                set : function(value) {
                    edgeDetection.uniformValues.color = value;
                }
            }
        });
        return new PostProcessComposite({
            name : 'czm_silhouette',
            processes : [silhouetteGenerateProcess, silhouetteProcess],
            executeInSeries : false,
            uniformValues : uniforms
        });
    };

    /**
     * Creates a post-process stage that applies a bloom effect to the input texture.
     * <p>
     * A bloom effect adds glow effect, makes bright areas brighter, and dark areas darker.
     * </p>
     * <p>
     * This post-process stage has the following uniforms: <code>contrast</code>, <code>brightness</code>, <code>glowOnly</code>,
     * <code>delta</code>, <code>sigma</code>, and <code>stepSize</code>.
     * </p>
     * <p>
     * <code>contrast</code> is a scalar value in the range [-255.0, 255.0] and affects the contract of the effect. The default value is <code>128.0</code>.
     * <code>brightness</code> is a scalar value. The input texture RGB value is converted to hue, saturation, and brightness (HSB) then this value is
     * added to the brightness. The default value is <code>-0.3</code>.
     * <code>glowOnly</code> is a boolean value. When <code>true</code>, only the glow effect will be shown. When <code>false</code>, the glow will be added to the input texture.
     * The default value is <code>false</code>. This is a debug option for viewing the effects when changing the other uniform values.
     * </p>
     * <p>
     * <code>delta</code>, <code>sigma</code>, and <code>stepSize</code> are the same properties as {@link PostProcessLibrary#createBlurStage}.
     * </p>
     * @return {PostProcessComposite} A post-process stage to applies a bloom effect.
     *
     * @private
     */
    PostProcessLibrary.createBloomStage = function() {
        var contrastBias = new PostProcess({
            name : 'czm_bloom_contrast_bias',
            fragmentShader : ContrastBias,
            uniformValues : {
                contrast : 128.0,
                brightness : -0.3
            }
        });
        var blur = createBlur('czm_bloom_blur');
        var generateComposite = new PostProcessComposite({
            name : 'czm_bloom_contrast_bias_blur',
            processes : [contrastBias, blur]
        });

        var bloomComposite = new PostProcess({
            name : 'czm_bloom_generate_composite',
            fragmentShader : BloomComposite,
            uniformValues : {
                glowOnly : false,
                bloomTexture : generateComposite.name
            }
        });

        var uniformValues = {};
        defineProperties(uniformValues, {
            glowOnly : {
                get : function() {
                    return bloomComposite.uniformValues.glowOnly;
                },
                set : function(value) {
                    bloomComposite.uniformValues.glowOnly = value;
                }
            },
            contrast : {
                get : function() {
                    return contrastBias.uniformValues.contrast;
                },
                set : function(value) {
                    contrastBias.uniformValues.contrast = value;
                }
            },
            brightness : {
                get : function() {
                    return contrastBias.uniformValues.brightness;
                },
                set : function(value) {
                    contrastBias.uniformValues.brightness = value;
                }
            },
            delta : {
                get : function() {
                    return blur.uniformValues.delta;
                },
                set : function(value) {
                    blur.uniformValues.delta = value;
                }
            },
            sigma : {
                get : function() {
                    return blur.uniformValues.sigma;
                },
                set : function(value) {
                    blur.uniformValues.sigma = value;
                }
            },
            stepSize : {
                get : function() {
                    return blur.uniformValues.stepSize;
                },
                set : function(value) {
                    blur.uniformValues.stepSize = value;
                }
            }
        });

        return new PostProcessComposite({
            name : 'czm_bloom',
            processes : [generateComposite, bloomComposite],
            executeInSeries : false,
            uniformValues : uniformValues
        });
    };

    /**
     * Creates a post-process stage that Horizon-based Ambient Occlusion (HBAO) to the input texture.
     * <p>
     * Ambient occlusion simulates shadows from ambient light. These shadows would always be present when the
     * surface receives light and regardless of the light's position.
     * </p>
     * <p>
     * The uniforms have the following properties: <code>intensity</code>, <code>bias</code>, <code>lengthCap</code>,
     * <code>stepSize</code>, <code>frustumLength</code>, <code>randomTexture</code>, <code>ambientOcclusionOnly</code>,
     * <code>delta</code>, <code>sigma</code>, and <code>blurStepSize</code>.
     * </p>
     * <p>
     * <code>intensity</code> is a scalar value used to lighten or darken the shadows exponentially. Higher values make the shadows darker. The default value is <code>3.0</code>.
     * <code>bias</code> is a scalar value representing an angle in radians. If the dot product between the normal of the sample and the vector to the camera is less than this value,
     * sampling stops in the current direction. This is used to remove shadows from near planar edges. The default value is <code>0.1</code>.
     * <code>lengthCap</code> is a scalar value representing a length in meters. If the distance from the current sample to first sample is greater than this value,
     * sampling stops in the current direction. The default value is <code>0.26</code>.
     * <code>stepSize</code> is a scalar value indicating the distance to the next texel sample in the current direction. The default value is <code>1.95</code>.
     * <code>frustumLength</code> is a scalar value in meters. If the current fragment has a distance from the camera greater than this value, ambient occlusion is not computed for the fragment.
     * The default value is <code>1000.0</code>.
     * <code>randomTexture</code> is a texture where the red channel is a random value in [0.0, 1.0]. The default value is <code>undefined</code>. This texture needs to be set.
     * <code>ambientOcclusionOnly</code> is a boolean value. When <code>true</code>, only the shadows generated are written to the output. When <code>false</code>, the input texture is modulated
     * with the ambient occlusion. This is a useful debug option for seeing the effects of changing the uniform values. The default value is <code>false</code>.
     * </p>
     * <p>
     * <code>delta</code>, <code>sigma</code>, and <code>blurStepSize</code> are the same properties as {@link PostProcessLibrary#createBlurStage}.
     * The blur is applied to the shadows generated from the image to make them smoother.
     * </p>
     * @return {PostProcessComposite} A post-process stage that applies an ambient occlusion effect.
     *
     * @private
     */
    PostProcessLibrary.createAmbientOcclusionStage = function() {
        var generate = new PostProcess({
            name : 'czm_ambient_occlusion_generate',
            fragmentShader : AmbientOcclusionGenerate,
            uniformValues : {
                intensity : 3.0,
                bias : 0.1,
                lengthCap : 0.26,
                stepSize : 1.95,
                frustumLength : 1000.0,
                randomTexture : undefined
            }
        });
        var blur = createBlur('czm_ambient_occlusion_blur');
        blur.uniformValues.stepSize = 0.86;
        var generateAndBlur = new PostProcessComposite({
            name : 'czm_ambient_occlusion_generate_blur',
            processes : [generate, blur]
        });

        var ambientOcclusionModulate = new PostProcess({
            name : 'czm_ambient_occlusion_composite',
            fragmentShader : AmbientOcclusion,
            uniformValues : {
                ambientOcclusionOnly : false,
                ambientOcclusionTexture : generateAndBlur.name
            }
        });

        var uniformValues = {};
        defineProperties(uniformValues, {
            intensity : {
                get : function() {
                    return generate.uniformValues.intensity;
                },
                set : function(value) {
                    generate.uniformValues.intensity = value;
                }
            },
            bias : {
                get : function() {
                    return generate.uniformValues.bias;
                },
                set : function(value) {
                    generate.uniformValues.bias = value;
                }
            },
            lengthCap : {
                get : function() {
                    return generate.uniformValues.lengthCap;
                },
                set : function(value) {
                    generate.uniformValues.lengthCap = value;
                }
            },
            stepSize : {
                get : function() {
                    return generate.uniformValues.stepSize;
                },
                set : function(value) {
                    generate.uniformValues.stepSize = value;
                }
            },
            frustumLength : {
                get : function() {
                    return generate.uniformValues.frustumLength;
                },
                set : function(value) {
                    generate.uniformValues.frustumLength = value;
                }
            },
            randomTexture : {
                get : function() {
                    return generate.uniformValues.randomTexture;
                },
                set : function(value) {
                    generate.uniformValues.randomTexture = value;
                }
            },
            delta : {
                get : function() {
                    return blur.uniformValues.delta;
                },
                set : function(value) {
                    blur.uniformValues.delta = value;
                }
            },
            sigma : {
                get : function() {
                    return blur.uniformValues.sigma;
                },
                set : function(value) {
                    blur.uniformValues.sigma = value;
                }
            },
            blurStepSize : {
                get : function() {
                    return blur.uniformValues.stepSize;
                },
                set : function(value) {
                    blur.uniformValues.stepSize = value;
                }
            },
            ambientOcclusionOnly : {
                get : function() {
                    return ambientOcclusionModulate.uniformValues.ambientOcclusionOnly;
                },
                set : function(value) {
                    ambientOcclusionModulate.uniformValues.ambientOcclusionOnly = value;
                }
            }
        });

        return new PostProcessComposite({
            name : 'czm_ambient_occlusion',
            processes : [generateAndBlur, ambientOcclusionModulate],
            executeInSeries : false,
            uniformValues : uniformValues
        });
    };

    var fxaaFS =
        '#define FXAA_QUALITY_PRESET 39 \n' +
        FXAA3_11 + '\n' +
        FXAA;

    /**
     * Creates a post-process stage that applies Fast Approximate Anti-aliasing (FXAA) to the input texture.
     * @return {PostProcess} A post-process stage that applies Fast Approximate Anti-aliasing to the input texture.
     *
     * @private
     */
    PostProcessLibrary.createFXAAStage = function() {
        return new PostProcess({
            name : 'czm_FXAA',
            fragmentShader : fxaaFS,
            sampleMode : PostProcessSampleMode.LINEAR
        });
    };

    /**
     * Creates a post-process stage that renders the input texture with black and white gradations.
     * <p>
     * This stage has one uniform value, <code>gradations</code>, which scales the luminance of each pixel.
     * </p>
     * @return {PostProcess} A post-process stage that renders the input texture with black and white gradations.
     */
    PostProcessLibrary.createBlackAndWhiteStage = function() {
        return new PostProcess({
            name : 'czm_black_and_white',
            fragmentShader : BlackAndWhite,
            uniformValues : {
                gradations : 5.0
            }
        });
    };

    /**
     * Creates a post-process stage that saturates the input texture.
     * <p>
     * This stage has one uniform value, <code>brightness</code>, which scales the saturation of each pixel.
     * </p>
     * @return {PostProcess} A post-process stage that saturates the input texture.
     */
    PostProcessLibrary.createBrightnessStage = function() {
        return new PostProcess({
            name : 'czm_brightness',
            fragmentShader : Brightness,
            uniformValues : {
                brightness : 0.5
            }
        });
    };

    /**
     * Creates a post-process stage that transforms the input texture to a pixelated eight-vit style image.
     * @return {PostProcess} A post-process stage that transforms the input texture to a pixelated eight-vit style image.
     */
    PostProcessLibrary.createEightBitStage = function() {
        return new PostProcess({
            name : 'czm_eight_bit',
            fragmentShader : EightBit
        });
    };

    /**
     * Creates a post-process stage that adds a night vision effect to the input texture.
     * @return {PostProcess} A post-process stage that adds a night vision effect to the input texture.
     */
    PostProcessLibrary.createNightVisionStage = function() {
        return new PostProcess({
            name : 'czm_night_vision',
            fragmentShader : NightVision
        });
    };

    /**
     * Creates a post-process stage that overlays a texture on the input texture.
     * <p>
     * This stage contains two uniforms: <code>texture</code> and <code>alpha</code>.
     * <code>texture</code> is the texture to overlay and defaults to an all white image.
     * <code>alpha</code> is the alpha for each texel of <code>texture</code> and defaults to 0.5.
     * </p>
     * @return {PostProcess} A post-process stage that overlays a texture on the input texture.
     */
    PostProcessLibrary.createTextureOverlayStage = function() {
        // not supplying a name means more than one effect can be added
        return new PostProcess({
            fragmentShader : TextureOverlay,
            uniformValues : {
                alpha : 0.5,
                // data uri for a 1x1 white canvas
                texture : 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQYV2P4////fwAJ+wP9BUNFygAAAABJRU5ErkJggg=='
            }
        });
    };

    /**
     * Creates a post-process stage that replaces the input color texture with a black and white texture representing the fragment depth at each pixel.
     * @return {PostProcess} A post-process stage that replaces the input color texture with a black and white texture representing the fragment depth at each pixel.
     *
     * @private
     */
    PostProcessLibrary.createDepthViewStage = function() {
        return new PostProcess({
            name : 'czm_depth_view',
            fragmentShader : DepthView
        });
    };

    /**
     * Creates a post-process stage that applies an effect simulating light flaring a camera lens.
     * <p>
     * This stage has the following uniforms: <code>dirtTexture</code>, <code>starTexture</code>, <code>intensity</code>, <code>distortion</code>, <code>ghostDispersal</code>,
     * <code>haloWidth</code>, and <code>earthRadius</code>. <code>dirtTexture</code> is a texture sampled to simulate dirt on the lens. <code>starTexture</code> is the texture
     * sampled for the star pattern of the flare. <code>intensity</code> is a scalar multiplied by the result of the lens flare. The default value is <code>2.0</code>.
     * <code>distortion</code> is a scalar value that affects the chromatic effect distortion. The default value is <code>10.0</code>.
     * <code>ghostDispesal</code> is a scalar indicating how far the halo effect is from the center of the texture. The default value is <code>0.4</code>.
     * <code>haloWidth</code> is a scalar representing the width of the halo  from the ghost dispersal. The default value is <code>0.4</code>.
     * <code>earthRadius</code> is the maximum radius of the earth. The default value is <code>Ellipsoid.WGS84.maximumRadius</code>.
     * </p>
     * @return {PostProcess} A post-process stage for applying a lens flare effect.
     */
    PostProcessLibrary.createLensFlarStage = function() {
        return new PostProcess({
            name : 'czm_lens_flare',
            fragmentShader : LensFlare,
            uniformValues : {
                dirtTexture : buildModuleUrl('Assets/Textures/LensFlare/DirtMask.jpg'),
                starTexture : buildModuleUrl('Assets/Textures/LensFlare/StarBurst.jpg'),
                intensity : 2.0,
                distortion : 10.0,
                ghostDispersal : 0.4,
                haloWidth : 0.4,
                earthRadius : Ellipsoid.WGS84.maximumRadius
            }
        });
    };

    return PostProcessLibrary;
});