defineSuite([
        'Core/PolygonGeometry',
        'Core/ArcType',
        'Core/arrayFill',
        'Core/BoundingSphere',
        'Core/Cartesian3',
        'Core/Ellipsoid',
        'Core/GeometryOffsetAttribute',
        'Core/GeometryPipeline',
        'Core/Math',
        'Core/Rectangle',
        'Core/VertexFormat',
        'Specs/createPackableSpecs'
    ], function(
        PolygonGeometry,
        ArcType,
        arrayFill,
        BoundingSphere,
        Cartesian3,
        Ellipsoid,
        GeometryOffsetAttribute,
        GeometryPipeline,
        CesiumMath,
        Rectangle,
        VertexFormat,
        createPackableSpecs) {
    'use strict';

    it('throws without hierarchy', function() {
        expect(function() {
            return new PolygonGeometry();
        }).toThrowDeveloperError();
    });

    it('throws with height when perPositionHeight is true', function() {
        expect(function() {
            return new PolygonGeometry({
                height: 30,
                perPositionHeight: true
            });
        }).toThrowDeveloperError();
    });

    it('throws without positions', function() {
        expect(function() {
            return PolygonGeometry.fromPositions();
        }).toThrowDeveloperError();
    });

    it('returns undefined with less than three positions', function() {
        expect(PolygonGeometry.createGeometry(PolygonGeometry.fromPositions({
            positions : [new Cartesian3()]
        }))).toBeUndefined();
    });

    it('returns undefined with polygon hierarchy with less than three positions', function() {
        expect(PolygonGeometry.createGeometry(new PolygonGeometry({
            polygonHierarchy : {
                positions : [Cartesian3.fromDegrees(0, 0)]
            }
        }))).toBeUndefined();
    });

    it('throws if arcType is not valid', function() {
        expect(function() {
            return new PolygonGeometry({
                positions : [Cartesian3.fromDegrees(0, 0),
                             Cartesian3.fromDegrees(1, 0),
                             Cartesian3.fromDegrees(1, 1)],
                arcType: ArcType.NONE
            });
        }).toThrowDeveloperError();
    });

    it('createGeometry returns undefined due to duplicate positions', function() {
        var geometry = PolygonGeometry.createGeometry(PolygonGeometry.fromPositions({
            positions : Cartesian3.fromDegreesArray([
                0.0, 0.0,
                0.0, 0.0,
                0.0, 0.0
            ])
        }));
        expect(geometry).toBeUndefined();
    });

    it('createGeometry returns undefined due to duplicate positions extruded', function() {
        var geometry = PolygonGeometry.createGeometry(PolygonGeometry.fromPositions({
            positions : Cartesian3.fromDegreesArray([
                0.0, 0.0,
                0.0, 0.0,
                0.0, 0.0
            ]),
            extrudedHeight: 2
        }));
        expect(geometry).toBeUndefined();
    });

    it('createGeometry returns undefined due to duplicate hierarchy positions', function() {
        var hierarchy = {
            positions : Cartesian3.fromDegreesArray([
                1.0, 1.0,
                1.0, 1.0,
                1.0, 1.0
            ]),
            holes : [{
                positions : Cartesian3.fromDegreesArray([
                    0.0, 0.0,
                    0.0, 0.0,
                    0.0, 0.0
                ])
            }]
        };

        var geometry = PolygonGeometry.createGeometry(new PolygonGeometry({ polygonHierarchy : hierarchy }));
        expect(geometry).toBeUndefined();
    });

    it('createGeometry returns undefined due to duplicate hierarchy positions with different heights', function() {
        var hierarchy = {
            positions : Cartesian3.fromDegreesArrayHeights([
                1.0, 1.0, 10.0,
                1.0, 1.0, 20.0,
                1.0, 1.0, 30.0
            ]),
            holes : [{
                positions : Cartesian3.fromDegreesArrayHeights([
                    0.0, 0.0, 10.0,
                    0.0, 0.0, 20.0,
                    0.0, 0.0, 30.0
                ])
            }]
        };

        var geometry = PolygonGeometry.createGeometry(new PolygonGeometry({ polygonHierarchy : hierarchy }));
        expect(geometry).toBeUndefined();
    });

    it('createGeometry returns geometry if duplicate hierarchy positions with different heights and perPositionHeight is true', function() {
        var hierarchy = {
            positions : Cartesian3.fromDegreesArrayHeights([
                1.0, 1.0, 10.0,
                1.0, 1.0, 20.0,
                1.0, 1.0, 30.0
            ]),
            holes : [{
                positions : Cartesian3.fromDegreesArrayHeights([
                    0.0, 0.0, 10.0,
                    0.0, 0.0, 20.0,
                    0.0, 0.0, 30.0
                ])
            }]
        };

        var geometry = PolygonGeometry.createGeometry(new PolygonGeometry({ polygonHierarchy : hierarchy, perPositionHeight: true }));
        expect(geometry).toBeDefined();
    });

    it('computes positions', function() {
        var p = PolygonGeometry.createGeometry(PolygonGeometry.fromPositions({
            vertexFormat : VertexFormat.POSITION_ONLY,
            positions : Cartesian3.fromDegreesArray([
                -1.0, -1.0,
                1.0, -1.0,
                1.0, 1.0,
                -1.0, 1.0
            ]),
            granularity: CesiumMath.RADIANS_PER_DEGREE
        }));

        expect(p.attributes.position.values.length).toEqual(13 * 3); // 8 around edge + 5 in the middle
        expect(p.indices.length).toEqual(16 * 3); //4 squares * 4 triangles per square
    });

    it('computes positions with per position heights', function() {
        var ellipsoid = Ellipsoid.WGS84;
        var height = 100.0;
        var positions = Cartesian3.fromDegreesArrayHeights([
           -1.0, -1.0, height,
           1.0, -1.0, 0.0,
           1.0, 1.0, 0.0,
           -1.0, 1.0, 0.0
       ]);
        var p = PolygonGeometry.createGeometry(PolygonGeometry.fromPositions({
            positions : positions,
            perPositionHeight : true
        }));

        expect(ellipsoid.cartesianToCartographic(Cartesian3.fromArray(p.attributes.position.values, 0)).height).toEqualEpsilon(height, CesiumMath.EPSILON6);
        expect(ellipsoid.cartesianToCartographic(Cartesian3.fromArray(p.attributes.position.values, 3)).height).toEqualEpsilon(0, CesiumMath.EPSILON6);
    });

    it('create geometry creates with rhumb lines', function() {
        var p = PolygonGeometry.createGeometry(PolygonGeometry.fromPositions({
            vertexFormat : VertexFormat.POSITION_ONLY,
            positions : Cartesian3.fromDegreesArray([
                -1.0, -1.0,
                1.0, -1.0,
                1.0, 1.0,
                -1.0, 1.0
            ]),
            granularity : CesiumMath.RADIANS_PER_DEGREE,
            arcType : ArcType.RHUMB
        }));

        expect(p.attributes.position.values.length).toEqual(13 * 3); // 8 around edge + 5 in the middle
        expect(p.indices.length).toEqual(16 * 3); //4 squares * 4 triangles per square
    });

    it('create geometry throws if arcType is STRAIGHT', function() {
        expect(function() {
            PolygonGeometry.createGeometry(PolygonGeometry.fromPositions({
                vertexFormat: VertexFormat.POSITION_ONLY,
                positions: Cartesian3.fromDegreesArray([
                    -1.0, -1.0,
                    1.0, -1.0,
                    1.0, 1.0,
                    -1.0, 1.0
                ]),
                granularity: CesiumMath.RADIANS_PER_DEGREE,
                arcType: ArcType.NONE
            }));
        }).toThrowDeveloperError();
    });

    it('create geometry creates with lines with different number of subdivisions for geodesic and rhumb', function() {
        var positions = Cartesian3.fromDegreesArray([
            -30.0, -30.0,
            30.0, -30.0,
            30.0, 30.0,
            -30.0, 30.0
        ]);
        var geodesic = PolygonGeometry.createGeometry(PolygonGeometry.fromPositions({
            vertexFormat : VertexFormat.POSITION_ONLY,
            positions : positions,
            granularity : CesiumMath.RADIANS_PER_DEGREE,
            arcType : ArcType.GEODESIC
        }));
        var rhumb = PolygonGeometry.createGeometry(PolygonGeometry.fromPositions({
            vertexFormat : VertexFormat.POSITION_ONLY,
            positions : positions,
            granularity : CesiumMath.RADIANS_PER_DEGREE,
            arcType : ArcType.RHUMB
        }));

        expect(geodesic.attributes.position.values.length).not.toEqual(rhumb.attributes.position.values.length);
        expect(geodesic.indices.length).not.toEqual(rhumb.indices.length);
    });

    it('computes positions with per position heights for rhumb lines', function() {
        var ellipsoid = Ellipsoid.WGS84;
        var height = 100.0;
        var positions = Cartesian3.fromDegreesArrayHeights([
           -1.0, -1.0, height,
           1.0, -1.0, 0.0,
           1.0, 1.0, 0.0,
           -1.0, 1.0, 0.0
       ]);
        var p = PolygonGeometry.createGeometry(PolygonGeometry.fromPositions({
            positions : positions,
            perPositionHeight : true,
            arcType : ArcType.RHUMB
        }));

        expect(ellipsoid.cartesianToCartographic(Cartesian3.fromArray(p.attributes.position.values, 0)).height).toEqualEpsilon(height, CesiumMath.EPSILON6);
        expect(ellipsoid.cartesianToCartographic(Cartesian3.fromArray(p.attributes.position.values, 3)).height).toEqualEpsilon(0, CesiumMath.EPSILON6);
    });

    it('computes all attributes', function() {
        var p = PolygonGeometry.createGeometry(PolygonGeometry.fromPositions({
            vertexFormat : VertexFormat.ALL,
            positions : Cartesian3.fromDegreesArray([
                -1.0, -1.0,
                1.0, -1.0,
                1.0, 1.0,
                -1.0, 1.0
            ])
        }));

        var numVertices = 13;
        var numTriangles = 16;
        expect(p.attributes.position.values.length).toEqual(numVertices * 3);
        expect(p.attributes.st.values.length).toEqual(numVertices * 2);
        expect(p.attributes.normal.values.length).toEqual(numVertices * 3);
        expect(p.attributes.tangent.values.length).toEqual(numVertices * 3);
        expect(p.attributes.bitangent.values.length).toEqual(numVertices * 3);
        expect(p.indices.length).toEqual(numTriangles * 3);
    });

    it('creates a polygon from hierarchy', function() {
        var hierarchy = {
            positions : Cartesian3.fromDegreesArray([
                -124.0, 35.0,
                -110.0, 35.0,
                -110.0, 40.0,
                -124.0, 40.0
            ]),
            holes : [{
                positions : Cartesian3.fromDegreesArray([
                    -122.0, 36.0,
                    -122.0, 39.0,
                    -112.0, 39.0,
                    -112.0, 36.0
                ]),
                holes : [{
                    positions : Cartesian3.fromDegreesArray([
                        -120.0, 36.5,
                        -114.0, 36.5,
                        -114.0, 38.5,
                        -120.0, 38.5
                    ])
                }]
            }]
        };

        var p = PolygonGeometry.createGeometry(new PolygonGeometry({
            vertexFormat : VertexFormat.POSITION_ONLY,
            polygonHierarchy : hierarchy,
            granularity : CesiumMath.PI_OVER_THREE
        }));

        expect(p.attributes.position.values.length).toEqual(12 * 3); // 4 points * 3 rectangles
        expect(p.indices.length).toEqual(10 * 3);
    });

    it('creates a polygon from hierarchy with rhumb lines', function() {
        var hierarchy = {
            positions : Cartesian3.fromDegreesArray([
                -124.0, 35.0,
                -110.0, 35.0,
                -110.0, 40.0,
                -124.0, 40.0
            ]),
            holes : [{
                positions : Cartesian3.fromDegreesArray([
                    -122.0, 36.0,
                    -122.0, 39.0,
                    -112.0, 39.0,
                    -112.0, 36.0
                ]),
                holes : [{
                    positions : Cartesian3.fromDegreesArray([
                        -120.0, 36.5,
                        -114.0, 36.5,
                        -114.0, 38.5,
                        -120.0, 38.5
                    ])
                }]
            }]
        };

        var p = PolygonGeometry.createGeometry(new PolygonGeometry({
            vertexFormat : VertexFormat.POSITION_ONLY,
            polygonHierarchy : hierarchy,
            granularity : CesiumMath.PI_OVER_THREE,
            arcType : ArcType.RHUMB
        }));

        expect(p.attributes.position.values.length).toEqual(12 * 3); // 4 points * 3 rectangles
        expect(p.indices.length).toEqual(10 * 3);
    });

    it('removes duplicates in polygon hierarchy', function() {
        var hierarchy = {
            positions : Cartesian3.fromDegreesArray([
                -124.0, 35.0,
                -110.0, 35.0,
                -110.0, 35.0,
                -110.0, 40.0,
                -124.0, 40.0
            ]),
            holes : [{
                positions : Cartesian3.fromDegreesArray([
                    -122.0, 36.0,
                    -122.0, 39.0,
                    -122.0, 39.0,
                    -112.0, 39.0,
                    -112.0, 36.0
                ]),
                holes : [{
                    positions : Cartesian3.fromDegreesArray([
                        -120.0, 36.5,
                        -114.0, 36.5,
                        -114.0, 36.5,
                        -114.0, 38.5,
                        -120.0, 38.5
                    ])
                }]
            }]
        };

        var p = PolygonGeometry.createGeometry(new PolygonGeometry({
            vertexFormat : VertexFormat.POSITION_ONLY,
            polygonHierarchy : hierarchy,
            granularity : CesiumMath.PI_OVER_THREE
        }));

        expect(p.attributes.position.values.length).toEqual(12 * 3);
        expect(p.indices.length).toEqual(10 * 3);
    });

    it('creates a polygon from clockwise hierarchy', function() {
        var hierarchy = {
            positions : Cartesian3.fromDegreesArray([
                -124.0, 35.0,
                -124.0, 40.0,
                -110.0, 40.0,
                -110.0, 35.0
            ]),
            holes : [{
                positions : Cartesian3.fromDegreesArray([
                    -122.0, 36.0,
                    -112.0, 36.0,
                    -112.0, 39.0,
                    -122.0, 39.0
                ]),
                holes : [{
                    positions : Cartesian3.fromDegreesArray([
                        -120.0, 36.5,
                        -120.0, 38.5,
                        -114.0, 38.5,
                        -114.0, 36.5
                    ])
                }]
            }]
        };

        var p = PolygonGeometry.createGeometry(new PolygonGeometry({
            vertexFormat : VertexFormat.POSITION_ONLY,
            polygonHierarchy : hierarchy,
            granularity : CesiumMath.PI_OVER_THREE
        }));

        expect(p.attributes.position.values.length).toEqual(12 * 3);
        expect(p.indices.length).toEqual(10 * 3);
    });

    it('doesn\'t reverse clockwise input array', function() {
        var p = Cartesian3.fromDegreesArray([
                                             -124.0, 35.0,
                                             -124.0, 40.0,
                                             -110.0, 40.0,
                                             -110.0, 35.0
                                         ]);
        var h1 = Cartesian3.fromDegreesArray([
                                              -122.0, 36.0,
                                              -112.0, 36.0,
                                              -112.0, 39.0,
                                              -122.0, 39.0
                                          ]);
        var h2 = Cartesian3.fromDegreesArray([
                                              -120.0, 36.5,
                                              -120.0, 38.5,
                                              -114.0, 38.5,
                                              -114.0, 36.5
                                          ]);
        var hierarchy = {
            positions : p,
            holes : [{
                positions : h1,
                holes : [{
                    positions : h2
                }]
            }]
        };

        PolygonGeometry.createGeometry(new PolygonGeometry({
            vertexFormat : VertexFormat.POSITION_ONLY,
            polygonHierarchy : hierarchy,
            granularity : CesiumMath.PI_OVER_THREE
        }));

        var i;
        var pExpected = Cartesian3.fromDegreesArray([
                                              -124.0, 35.0,
                                              -124.0, 40.0,
                                              -110.0, 40.0,
                                              -110.0, 35.0
                                          ]);
        for (i = 0; i < p.length; i++) {
            expect(p[i]).toEqualEpsilon(pExpected[i], CesiumMath.EPSILON7);
        }

        var h1Expected = Cartesian3.fromDegreesArray([
                                               -122.0, 36.0,
                                               -112.0, 36.0,
                                               -112.0, 39.0,
                                               -122.0, 39.0
                                           ]);
        for (i = 0; i < h1.length; i++) {
            expect(h1[i]).toEqualEpsilon(h1Expected[i], CesiumMath.EPSILON7);
        }

        var h2Expected = Cartesian3.fromDegreesArray([
                                               -120.0, 36.5,
                                               -120.0, 38.5,
                                               -114.0, 38.5,
                                               -114.0, 36.5
                                           ]);
        for (i = 0; i <h2.length; i++) {
            expect(h2[i]).toEqualEpsilon(h2Expected[i], CesiumMath.EPSILON7);
        }
    });

    it('computes correct bounding sphere at height 0', function() {
        var p = PolygonGeometry.createGeometry(PolygonGeometry.fromPositions({
            vertexFormat : VertexFormat.ALL,
            positions : Cartesian3.fromDegreesArray([
                -108.0, 1.0,
                -108.0, -1.0,
                -106.0, -1.0,
                -106.0, 1.0
            ]),
            granularity : CesiumMath.PI_OVER_THREE
        }));

        var bs = BoundingSphere.fromVertices(p.attributes.position.values);
        expect(p.boundingSphere.center).toEqualEpsilon(bs.center, CesiumMath.EPSILON9);
        expect(p.boundingSphere.radius).toEqualEpsilon(bs.radius, CesiumMath.EPSILON9);
    });

    it('computes correct bounding sphere at height >>> 0', function() {
        var height = 40000000.0;
        var positions = Cartesian3.fromDegreesArray([
            -108.0, 1.0,
            -108.0, -1.0,
            -106.0, -1.0,
            -106.0, 1.0
        ]);

        var p = PolygonGeometry.createGeometry(PolygonGeometry.fromPositions({
            vertexFormat : VertexFormat.POSITIONS_ONLY,
            positions : positions,
            height : height
        }));

        var bs = BoundingSphere.fromPoints(Cartesian3.fromDegreesArrayHeights([
            -108.0, 1.0, height,
            -108.0, -1.0, height,
            -106.0, -1.0, height,
            -106.0, 1.0, height
        ]));
        expect(Math.abs(p.boundingSphere.radius - bs.radius)).toBeLessThan(100.0);
    });

    it('computes positions extruded', function() {
        var p = PolygonGeometry.createGeometry(PolygonGeometry.fromPositions({
            vertexFormat : VertexFormat.POSITION_ONLY,
            positions : Cartesian3.fromDegreesArray([
                -1.0, -1.0,
                1.0, -1.0,
                1.0, 1.0,
                -1.0, 1.0
            ]),
            extrudedHeight: 30000
        }));

        var numVertices = 50; // 13 top + 13 bottom + 8 top edge + 8 bottom edge + 4 top corner + 4 bottom corner
        var numTriangles = 48; // 16 top fill + 16 bottom fill + 2 triangles * 4 sides
        expect(p.attributes.position.values.length).toEqual(numVertices * 3);
        expect(p.indices.length).toEqual(numTriangles * 3);
    });

    it('computes positions extruded and not closeTop', function() {
        var p = PolygonGeometry.createGeometry(PolygonGeometry.fromPositions({
             vertexFormat : VertexFormat.POSITION_ONLY,
             positions : Cartesian3.fromDegreesArray([
                                                         -1.0, -1.0,
                                                         1.0, -1.0,
                                                         1.0, 1.0,
                                                         -1.0, 1.0
                                                     ]),
             extrudedHeight: 30000,
             closeTop: false
         }));

        var numVertices = 37; // 13 bottom + 8 top edge + 8 bottom edge + 4 top corner + 4 bottom corner
        var numTriangles = 32; // 16 bottom fill + 2 triangles * 4 sides
        expect(p.attributes.position.values.length).toEqual(numVertices * 3);
        expect(p.indices.length).toEqual(numTriangles * 3);
    });

    it('computes positions extruded and not closeBottom', function() {
        var p = PolygonGeometry.createGeometry(PolygonGeometry.fromPositions({
             vertexFormat : VertexFormat.POSITION_ONLY,
             positions : Cartesian3.fromDegreesArray([
                                                         -1.0, -1.0,
                                                         1.0, -1.0,
                                                         1.0, 1.0,
                                                         -1.0, 1.0
                                                     ]),
             extrudedHeight: 30000,
             closeBottom: false
         }));

        var numVertices = 37; // 13 top + 8 top edge + 8 bottom edge + 4 top corner + 4 bottom corner
        var numTriangles = 32; // 16 top fill + 2 triangles * 4 sides
        expect(p.attributes.position.values.length).toEqual(numVertices * 3);
        expect(p.indices.length).toEqual(numTriangles * 3);
    });

    it('computes positions extruded and not closeBottom or closeTop', function() {
        var p = PolygonGeometry.createGeometry(PolygonGeometry.fromPositions({
             vertexFormat : VertexFormat.POSITION_ONLY,
             positions : Cartesian3.fromDegreesArray([
                                                         -1.0, -1.0,
                                                         1.0, -1.0,
                                                         1.0, 1.0,
                                                         -1.0, 1.0
                                                     ]),
             extrudedHeight: 30000,
             closeTop: false,
             closeBottom: false
         }));

        var numVertices = 24; // 8 top edge + 8 bottom edge + 4 top corner + 4 bottom corner
        var numTriangles = 16; // 2 triangles * 4 sides
        expect(p.attributes.position.values.length).toEqual(numVertices * 3);
        expect(p.indices.length).toEqual(numTriangles * 3);
    });

    it('computes offset attribute', function() {
        var p = PolygonGeometry.createGeometry(PolygonGeometry.fromPositions({
            vertexFormat : VertexFormat.POSITION_ONLY,
            positions : Cartesian3.fromDegreesArray([
                -1.0, -1.0,
                1.0, -1.0,
                1.0, 1.0,
                -1.0, 1.0
            ]),
            granularity: CesiumMath.RADIANS_PER_DEGREE,
            offsetAttribute: GeometryOffsetAttribute.TOP
        }));

        var numVertices = 13;
        expect(p.attributes.position.values.length).toEqual(numVertices * 3);

        var offset = p.attributes.applyOffset.values;
        expect(offset.length).toEqual(numVertices);
        var expected = new Array(offset.length);
        expected = arrayFill(expected, 1);
        expect(offset).toEqual(expected);
    });

    it('computes offset attribute extruded for top vertices', function() {
        var p = PolygonGeometry.createGeometry(PolygonGeometry.fromPositions({
            vertexFormat : VertexFormat.POSITION_ONLY,
            positions : Cartesian3.fromDegreesArray([
                -1.0, -1.0,
                1.0, -1.0,
                1.0, 1.0,
                -1.0, 1.0
            ]),
            extrudedHeight: 30000,
            offsetAttribute: GeometryOffsetAttribute.TOP
        }));

        var numVertices = 50;
        expect(p.attributes.position.values.length).toEqual(numVertices * 3);

        var offset = p.attributes.applyOffset.values;
        expect(offset.length).toEqual(numVertices);
        var expected = new Array(offset.length);
        expected = arrayFill(expected, 0);
        expected = arrayFill(expected, 1, 0, 13);
        expected = arrayFill(expected, 1, 26, 38);
        expect(offset).toEqual(expected);
    });

    it('computes offset attribute extruded and not closeTop for top vertices', function() {
        var p = PolygonGeometry.createGeometry(PolygonGeometry.fromPositions({
            vertexFormat : VertexFormat.POSITION_ONLY,
            positions : Cartesian3.fromDegreesArray([
                -1.0, -1.0,
                1.0, -1.0,
                1.0, 1.0,
                -1.0, 1.0
            ]),
            extrudedHeight: 30000,
            closeTop: false,
            offsetAttribute: GeometryOffsetAttribute.TOP
        }));

        var numVertices = 37; // 13 bottom + 8 top edge + 8 bottom edge + 4 top corner + 4 bottom corner
        expect(p.attributes.position.values.length).toEqual(numVertices * 3);

        var offset = p.attributes.applyOffset.values;
        expect(offset.length).toEqual(numVertices);
        var expected = new Array(offset.length);
        expected = arrayFill(expected, 0);
        expected = arrayFill(expected, 1, 13, 25);
        expect(offset).toEqual(expected);
    });

    it('computes offset attribute extruded and not closeBottom for top vertcies', function() {
        var p = PolygonGeometry.createGeometry(PolygonGeometry.fromPositions({
            vertexFormat : VertexFormat.POSITION_ONLY,
            positions : Cartesian3.fromDegreesArray([
                -1.0, -1.0,
                1.0, -1.0,
                1.0, 1.0,
                -1.0, 1.0
            ]),
            extrudedHeight: 30000,
            closeBottom: false,
            offsetAttribute: GeometryOffsetAttribute.TOP
        }));

        var numVertices = 37;
        expect(p.attributes.position.values.length).toEqual(numVertices * 3);

        var offset = p.attributes.applyOffset.values;
        expect(offset.length).toEqual(numVertices);
        var expected = new Array(offset.length);
        expected = arrayFill(expected, 0);
        expected = arrayFill(expected, 1, 0, 25);
        expect(offset).toEqual(expected);
    });

    it('computes offset attribute extruded and not closeBottom or closeTop for top vertices', function() {
        var p = PolygonGeometry.createGeometry(PolygonGeometry.fromPositions({
            vertexFormat : VertexFormat.POSITION_ONLY,
            positions : Cartesian3.fromDegreesArray([
                -1.0, -1.0,
                1.0, -1.0,
                1.0, 1.0,
                -1.0, 1.0
            ]),
            extrudedHeight: 30000,
            closeTop: false,
            closeBottom: false,
            offsetAttribute: GeometryOffsetAttribute.TOP
        }));

        var numVertices = 24;
        expect(p.attributes.position.values.length).toEqual(numVertices * 3);

        var offset = p.attributes.applyOffset.values;
        expect(offset.length).toEqual(numVertices);
        var expected = new Array(offset.length);
        expected = arrayFill(expected, 0);
        expected = arrayFill(expected, 1, 0, 12);
        expect(offset).toEqual(expected);
    });

    it('computes offset attribute extruded for all vertices', function() {
        var p = PolygonGeometry.createGeometry(PolygonGeometry.fromPositions({
            vertexFormat : VertexFormat.POSITION_ONLY,
            positions : Cartesian3.fromDegreesArray([
                -1.0, -1.0,
                1.0, -1.0,
                1.0, 1.0,
                -1.0, 1.0
            ]),
            extrudedHeight: 30000,
            offsetAttribute: GeometryOffsetAttribute.ALL
        }));

        var numVertices = 50;
        expect(p.attributes.position.values.length).toEqual(numVertices * 3);

        var offset = p.attributes.applyOffset.values;
        expect(offset.length).toEqual(numVertices);
        var expected = new Array(offset.length);
        expected = arrayFill(expected, 1);
        expect(offset).toEqual(expected);
    });

    it('computes offset attribute extruded and not closeTop for all vertices', function() {
        var p = PolygonGeometry.createGeometry(PolygonGeometry.fromPositions({
            vertexFormat : VertexFormat.POSITION_ONLY,
            positions : Cartesian3.fromDegreesArray([
                -1.0, -1.0,
                1.0, -1.0,
                1.0, 1.0,
                -1.0, 1.0
            ]),
            extrudedHeight: 30000,
            closeTop: false,
            offsetAttribute: GeometryOffsetAttribute.ALL
        }));

        var numVertices = 37; // 13 bottom + 8 top edge + 8 bottom edge + 4 top corner + 4 bottom corner
        expect(p.attributes.position.values.length).toEqual(numVertices * 3);

        var offset = p.attributes.applyOffset.values;
        expect(offset.length).toEqual(numVertices);
        var expected = new Array(offset.length);
        expected = arrayFill(expected, 1);
        expect(offset).toEqual(expected);
    });

    it('computes offset attribute extruded and not closeBottom for all vertcies', function() {
        var p = PolygonGeometry.createGeometry(PolygonGeometry.fromPositions({
            vertexFormat : VertexFormat.POSITION_ONLY,
            positions : Cartesian3.fromDegreesArray([
                -1.0, -1.0,
                1.0, -1.0,
                1.0, 1.0,
                -1.0, 1.0
            ]),
            extrudedHeight: 30000,
            closeBottom: false,
            offsetAttribute: GeometryOffsetAttribute.ALL
        }));

        var numVertices = 37;
        expect(p.attributes.position.values.length).toEqual(numVertices * 3);

        var offset = p.attributes.applyOffset.values;
        expect(offset.length).toEqual(numVertices);
        var expected = new Array(offset.length);
        expected = arrayFill(expected, 1);
        expect(offset).toEqual(expected);
    });

    it('computes offset attribute extruded and not closeBottom or closeTop for all vertices', function() {
        var p = PolygonGeometry.createGeometry(PolygonGeometry.fromPositions({
            vertexFormat : VertexFormat.POSITION_ONLY,
            positions : Cartesian3.fromDegreesArray([
                -1.0, -1.0,
                1.0, -1.0,
                1.0, 1.0,
                -1.0, 1.0
            ]),
            extrudedHeight: 30000,
            closeTop: false,
            closeBottom: false,
            offsetAttribute: GeometryOffsetAttribute.ALL
        }));

        var numVertices = 24;
        expect(p.attributes.position.values.length).toEqual(numVertices * 3);

        var offset = p.attributes.applyOffset.values;
        expect(offset.length).toEqual(numVertices);
        var expected = new Array(offset.length);
        expected = arrayFill(expected, 1);
        expect(offset).toEqual(expected);
    });

    it('removes duplicates extruded', function() {
        var p = PolygonGeometry.createGeometry(PolygonGeometry.fromPositions({
            vertexFormat : VertexFormat.POSITION_ONLY,
            positions : Cartesian3.fromDegreesArray([
                -1.0, -1.0,
                1.0, -1.0,
                1.0, 1.0,
                -1.0, 1.0,
                -1.0, -1.0
            ]),
            extrudedHeight: 30000
        }));

        expect(p.attributes.position.values.length).toEqual(50 * 3);
        expect(p.indices.length).toEqual(48 * 3);
    });

    it('Ignores extrudedHeight if it equals height.', function() {
        var p = PolygonGeometry.createGeometry(PolygonGeometry.fromPositions({
             vertexFormat : VertexFormat.POSITION_ONLY,
             positions : Cartesian3.fromDegreesArray([
                                                         -1.0, -1.0,
                                                         1.0, -1.0,
                                                         1.0, 1.0,
                                                         -1.0, 1.0
                                                     ]),
            height: 0,
            extrudedHeight: CesiumMath.EPSILON7
         }));

        expect(p.attributes.position.values.length).toEqual(13 * 3);
        expect(p.indices.length).toEqual(16 * 3);
    });

    it('computes all attributes extruded', function() {
        var p = PolygonGeometry.createGeometry(new PolygonGeometry({
            vertexFormat : VertexFormat.ALL,
            polygonHierarchy: {
                positions : Cartesian3.fromDegreesArray([
                    -1.0, -1.0,
                    1.0, -1.0,
                    1.0, 1.0,
                    -1.0, 1.0
                ])},
            extrudedHeight: 30000
        }));

        var numVertices = 50;
        var numTriangles = 48;
        expect(p.attributes.position.values.length).toEqual(numVertices * 3);
        expect(p.attributes.st.values.length).toEqual(numVertices * 2);
        expect(p.attributes.normal.values.length).toEqual(numVertices * 3);
        expect(p.attributes.tangent.values.length).toEqual(numVertices * 3);
        expect(p.attributes.bitangent.values.length).toEqual(numVertices * 3);
        expect(p.indices.length).toEqual(numTriangles * 3);
    });

    it('computes correct texture coordinates for polygon with height', function() {
        var p = PolygonGeometry.createGeometry(new PolygonGeometry({
            vertexFormat : VertexFormat.POSITION_AND_ST,
            polygonHierarchy: {
                positions : Cartesian3.fromDegreesArray([
                    -100.5, 30.0,
                    -100.0, 30.0,
                    -100.0, 30.5,
                    -100.5, 30.5
                ])},
            height: 150000,
            granularity: CesiumMath.PI
        }));

        var st = p.attributes.st.values;
        for (var i = 0; i < st.length; i++) {
            expect(st[i]).toBeGreaterThanOrEqualTo(0);
            expect(st[i]).toBeLessThanOrEqualTo(1);
        }
    });

    it('computes correct texture coordinates for polygon with position heights', function() {
        var p = PolygonGeometry.createGeometry(new PolygonGeometry({
            vertexFormat : VertexFormat.POSITION_AND_ST,
            polygonHierarchy: {
                positions : Cartesian3.fromDegreesArrayHeights([
                    -100.5, 30.0, 92,
                    -100.0, 30.0, 92,
                    -100.0, 30.5, 92,
                    -100.5, 30.5, 92
                ])},
            granularity: CesiumMath.PI
        }));

        var st = p.attributes.st.values;
        for (var i = 0; i < st.length; i++) {
            expect(st[i]).toBeGreaterThanOrEqualTo(0);
            expect(st[i]).toBeLessThanOrEqualTo(1);
        }
    });

    it('creates a polygon from hierarchy extruded', function() {
        var hierarchy = {
            positions : Cartesian3.fromDegreesArray([
                -124.0, 35.0,
                -110.0, 35.0,
                -110.0, 40.0,
                -124.0, 40.0
            ]),
            holes : [{
                positions : Cartesian3.fromDegreesArray([
                    -122.0, 36.0,
                    -122.0, 39.0,
                    -112.0, 39.0,
                    -112.0, 36.0
                ]),
                holes : [{
                    positions : Cartesian3.fromDegreesArray([
                        -120.0, 36.5,
                        -114.0, 36.5,
                        -114.0, 38.5,
                        -120.0, 38.5
                    ])
                }]
            }]
        };

        var p = PolygonGeometry.createGeometry(new PolygonGeometry({
            vertexFormat : VertexFormat.POSITION_ONLY,
            polygonHierarchy : hierarchy,
            granularity : CesiumMath.PI_OVER_THREE,
            extrudedHeight: 30000
        }));

        // (4 points * 3 rectangles * 3 to duplicate for normals) * 2 for top and bottom
        expect(p.attributes.position.values.length).toEqual(72 * 3);
        // 10 top + 10 bottom + 2 triangles * 12 walls
        expect(p.indices.length).toEqual(44 * 3);
    });

    it('undefined is returned if there are less than 3 positions', function() {
        var polygon = PolygonGeometry.fromPositions({
            positions : Cartesian3.fromDegreesArray([
                -72.0, 40.0,
                -68.0, 40.0
            ])
        });

        var geometry = PolygonGeometry.createGeometry(polygon);

        expect(geometry).toBeUndefined();
    });

    it('computes normals for perPositionHeight', function() {
        var geometry = PolygonGeometry.createGeometry(PolygonGeometry.fromPositions({
                positions: [new Cartesian3(1333485.211963876, -4654510.505548239, 4138557.5850382405),
                            new Cartesian3(1333441.3994441305, -4654261.147368878, 4138322.784348336),
                            new Cartesian3(1333521.9333286814, -4654490.298890729, 4138567.564118971)],
                extrudedHeight: 56,
                vertexFormat: VertexFormat.POSITION_AND_NORMAL,
                perPositionHeight: true,
                closeBottom: false
            })
        );

        var normals = geometry.attributes.normal.values;

        geometry = GeometryPipeline.computeNormal(geometry);
        var expectedNormals = geometry.attributes.normal.values;

        var notEqualCount = 0;
        for (var i = 0; i < expectedNormals.length; i++) {
            if (!CesiumMath.equalsEpsilon(normals[i], expectedNormals[i], CesiumMath.EPSILON6)) {
                notEqualCount++;
            }
        }

        //Exactly 2 normals will be different due to weird triangles on the walls of the extrusion
        //PolygonGeometry needs major changes to how extruded walls are computed with perPositionHeight in order to improve this
        expect(notEqualCount).toEqual(6);
    });

    it('computes geometry with position only vertex format with perPositionHeight and extrudedHeight', function() {
        var positions = Cartesian3.fromDegreesArrayHeights([
            -1.0, -1.0, 100.0,
            1.0, -1.0, 0.0,
            1.0, 1.0, 100.0,
            -1.0, 1.0, 0.0
        ]);
        var geometry = PolygonGeometry.createGeometry(PolygonGeometry.fromPositions({
            positions : positions,
            extrudedHeight: 0,
            vertexFormat : VertexFormat.POSITION_ONLY,
            perPositionHeight : true
        }));
        expect(geometry).toBeDefined();
        expect(geometry.attributes.position).toBeDefined();
        expect(geometry.attributes.normal).toBeUndefined();
    });

    it('computing rectangle property', function() {
        var p = new PolygonGeometry({
            vertexFormat : VertexFormat.POSITION_AND_ST,
            polygonHierarchy: {
                positions : Cartesian3.fromDegreesArrayHeights([
                    -100.5, 30.0, 92,
                    -100.0, 30.0, 92,
                    -100.0, 30.5, 92,
                    -100.5, 30.5, 92
                ])},
            granularity: CesiumMath.PI
        });

        var r = p.rectangle;
        expect(CesiumMath.toDegrees(r.north)).toEqualEpsilon(30.5, CesiumMath.EPSILON13);
        expect(CesiumMath.toDegrees(r.south)).toEqualEpsilon(30.0, CesiumMath.EPSILON13);
        expect(CesiumMath.toDegrees(r.east)).toEqualEpsilon(-100.0, CesiumMath.EPSILON13);
        expect(CesiumMath.toDegrees(r.west)).toEqualEpsilon(-100.5, CesiumMath.EPSILON13);
    });

    it('computeRectangle', function() {
        var options = {
            vertexFormat : VertexFormat.POSITION_AND_ST,
            polygonHierarchy: {
                positions : Cartesian3.fromDegreesArrayHeights([
                    -100.5, 30.0, 92,
                    -100.0, 30.0, 92,
                    -100.0, 30.5, 92,
                    -100.5, 30.5, 92
                ])
            },
            ellipsoid: Ellipsoid.UNIT_SPHERE
        };
        var geometry = new PolygonGeometry(options);

        var expected = geometry.rectangle;
        var result = PolygonGeometry.computeRectangle(options);

        expect(result).toEqual(expected);
    });

    it('computeRectangle with result parameter', function() {
        var options = {
            polygonHierarchy: {
                positions : Cartesian3.fromDegreesArray([
                    -10.5, 25.0,
                    -10.0, 25.0,
                    -10.0, 25.5,
                    -10.5, 25.5
                ])
            }
        };
        var geometry = new PolygonGeometry(options);

        var result = new Rectangle();
        var expected = geometry.rectangle;
        var returned = PolygonGeometry.computeRectangle(options, result);

        expect(returned).toEqual(expected);
        expect(returned).toBe(result);
    });

    it('computing textureCoordinateRotationPoints property', function() {
        var p = new PolygonGeometry({
            vertexFormat : VertexFormat.POSITION_AND_ST,
            polygonHierarchy: {
                positions : Cartesian3.fromDegreesArrayHeights([
                    -10.0, -10.0, 0,
                    -10.0, 10.0, 0,
                    10.0, -10.0, 0,
                    10.0, 10.0, 0
                ])},
            granularity: CesiumMath.PI,
            stRotation : CesiumMath.toRadians(90)
        });

        // 90 degree rotation means (0, 1) should be the new min and (1, 1) (0, 0) are extents
        var textureCoordinateRotationPoints = p.textureCoordinateRotationPoints;
        expect(textureCoordinateRotationPoints.length).toEqual(6);
        expect(textureCoordinateRotationPoints[0]).toEqualEpsilon(0, CesiumMath.EPSILON7);
        expect(textureCoordinateRotationPoints[1]).toEqualEpsilon(1, CesiumMath.EPSILON7);
        expect(textureCoordinateRotationPoints[2]).toEqualEpsilon(1, CesiumMath.EPSILON7);
        expect(textureCoordinateRotationPoints[3]).toEqualEpsilon(1, CesiumMath.EPSILON7);
        expect(textureCoordinateRotationPoints[4]).toEqualEpsilon(0, CesiumMath.EPSILON7);
        expect(textureCoordinateRotationPoints[5]).toEqualEpsilon(0, CesiumMath.EPSILON7);

        p = new PolygonGeometry({
            vertexFormat : VertexFormat.POSITION_AND_ST,
            polygonHierarchy: {
                positions : Cartesian3.fromDegreesArrayHeights([
                    -10.0, -10.0, 0,
                    -10.0, 10.0, 0,
                    10.0, -10.0, 0,
                    10.0, 10.0, 0
                ])},
            granularity: CesiumMath.PI,
            stRotation : CesiumMath.toRadians(0)
        });

        textureCoordinateRotationPoints = p.textureCoordinateRotationPoints;
        expect(textureCoordinateRotationPoints.length).toEqual(6);
        expect(textureCoordinateRotationPoints[0]).toEqualEpsilon(0, CesiumMath.EPSILON7);
        expect(textureCoordinateRotationPoints[1]).toEqualEpsilon(0, CesiumMath.EPSILON7);
        expect(textureCoordinateRotationPoints[2]).toEqualEpsilon(0, CesiumMath.EPSILON7);
        expect(textureCoordinateRotationPoints[3]).toEqualEpsilon(1, CesiumMath.EPSILON7);
        expect(textureCoordinateRotationPoints[4]).toEqualEpsilon(1, CesiumMath.EPSILON7);
        expect(textureCoordinateRotationPoints[5]).toEqualEpsilon(0, CesiumMath.EPSILON7);
    });

    var positions = Cartesian3.fromDegreesArray([
        -12.4, 3.5,
        -12.0, 3.5,
        -12.0, 4.0
    ]);
    var holePositions0 = Cartesian3.fromDegreesArray([
        -12.2, 3.5,
        -12.2, 3.6,
        -12.3, 3.6
    ]);
    var holePositions1 = Cartesian3.fromDegreesArray([
        -12.20, 3.5,
        -12.25, 3.5,
        -12.25, 3.55
    ]);
    var hierarchy = {
        positions : positions,
        holes : [{
            positions : holePositions0,
            holes : [{
                positions : holePositions1,
                holes : undefined
            }]
        }]
    };

    var polygon = new PolygonGeometry({
        vertexFormat : VertexFormat.POSITION_ONLY,
        polygonHierarchy : hierarchy,
        granularity : CesiumMath.PI_OVER_THREE,
        perPositionHeight : true,
        closeTop : false,
        closeBottom : true
    });

    function addPositions(array, positions) {
        for (var i = 0; i < positions.length; ++i) {
            array.push(positions[i].x, positions[i].y, positions[i].z);
        }
    }

    var packedInstance = [3.0, 1.0];
    addPositions(packedInstance, positions);
    packedInstance.push(3.0, 1.0);
    addPositions(packedInstance, holePositions0);
    packedInstance.push(3.0, 0.0);
    addPositions(packedInstance, holePositions1);
    packedInstance.push(Ellipsoid.WGS84.radii.x, Ellipsoid.WGS84.radii.y, Ellipsoid.WGS84.radii.z);
    packedInstance.push(1.0, 0.0, 0.0, 0.0, 0.0, 0.0);
    packedInstance.push(0.0, 0.0, CesiumMath.PI_OVER_THREE, 0.0, 0.0, 1.0, 0, 1, 0, -1, ArcType.GEODESIC, 54);
    createPackableSpecs(PolygonGeometry, polygon, packedInstance);
});
