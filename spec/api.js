describe("API to JS (integration test)", function () {

    //our main testsubject
    var eg = Egnyte.init(egnyteDomain, {
        token: APIToken,
        QPS: 2
    });


    function getTestBlob(txt) {
        // JavaScript file-like object...
        var content = '<a id="a"><b id="b">' + txt + '</b></a>'; // the body of the new file...
        //PhanthomJS has a broken Blob
        try {
            var blob = new Blob([content], {
                type: "text/xml"
            });
        } catch (e) {
            var builder = new WebKitBlobBuilder();
            builder.append(content);
            var blob = builder.getBlob();
        }
        return blob;
    }

    it('BTW. The test should have a working matcher for errors', function () {
        //token was passed in beforeEach
        expect(expect(this).toAutoFail).toBeDefined();
    });

    if (!window.egnyteDomain || !window.APIToken) {
        throw new Error("spec/conf/apiaccess.js is missing");
    }

    beforeEach(function () {
        jasmine.getEnv().defaultTimeoutInterval = 10000; //QA API can be laggy
        jasmine.DEFAULT_TIMEOUT_INTERVAL = 10000; //QA API can be laggy

    });

    it('should accept an existing token', function () {
        //token was passed in beforeEach
        expect(eg.API.auth.isAuthorized()).toBe(true);
    });


    describe("Auth", function () {


        var recentFileObject;

        it("Should provide userinfo", function (done) {
            eg.API.auth.getUserInfo().then(function (info) {
                expect(info).toBeTruthy();
                expect(info.username).toBeDefined();
                expect(info.username.length).toBeGreaterThan(1);
                done();
            }).error(function (e) {
                expect(this).toAutoFail(e);
            });

        });

    });


    var testpath;
    var testpath2;
    var testpath3;


    describe("Storage", function () {


        var recentFileObject;

        it("Should claim that root exists", function (done) {
            eg.API.storage.exists("/Private").then(function (e) {
                expect(e).toBe(true);
                done();
            }).error(function (e) {
                expect(this).toAutoFail(e);
            });

        });
        it("Should claim that jiberish doesn't exists", function (done) {
            eg.API.storage.exists("/jiberish").then(function (e) {
                expect(e).toBe(false);
                done();
            }).error(function (e) {
                expect(this).toAutoFail(e);
            });

        });
        it("Should be able to fetch a private folder", function (done) {
            eg.API.storage.get("/Private").then(function (e) {
                expect(e["folders"]).toBeDefined();
                //this test suite has unicorns and bacon, it can't get any better/
                testpath = e.folders[0].path + "/bacon" + ~~(10000 * Math.random());
                testpath2 = e.folders[0].path + "/unicorn" + ~~(10000 * Math.random());
                testpath3 = e.folders[0].path + "/candy" + ~~(10000 * Math.random());
                done();
            }).error(function (e) {
                expect(this).toAutoFail(e);
            });

        });
        it("Can create a folder", function (done) {
            eg.API.storage.createFolder(testpath)
                .then(function (e) {
                    expect(e.path).toEqual(testpath);
                })
                .then(function () {
                    return eg.API.storage.exists(testpath);
                })
                .then(function (e) {
                    expect(e).toBe(true);
                    done();
                }).error(function (e) {
                    expect(this).toAutoFail(e);
                });

        });

        it("Forbids creating folder in root", function (done) {
            eg.API.storage.createFolder("/foo")
                .then(function (e) {
                    expect(this).toAutoFail("was created");
                })
                .error(function (e) {
                    expect(e.response.statusCode).toEqual(409);
                    done();
                });

        });
        
        it("Gets a 596 on weird mess in paths", function (done) {
            eg.API.storage.exists("%20foo")
                .then(function (e) {
                    expect(this).toAutoFail(e);
                })
                .error(function (e) {
                    console.log(e);
                    expect(e.response.statusCode).toEqual(596);
                    done();
                });

        });

        it("Can move a folder", function (done) {
            eg.API.storage.move(testpath, testpath2)
                .then(function (e) {
                    expect(e.oldPath).toEqual(testpath);
                    expect(e.path).toEqual(testpath2);
                })
                .then(function () {
                    return eg.API.storage.exists(testpath);
                })
                .then(function (e) {
                    expect(e).toBe(false);

                    setTimeout(function () {
                        eg.API.storage.exists(testpath2)
                            .then(function (e) {
                                expect(e).toBe(true);
                                done();
                            });
                    }, 400);
                }).error(function (e) {
                    expect(this).toAutoFail(e);
                });

        });
        it("Can remove a folder", function (done) {
            eg.API.storage.remove(testpath2)
                .then(function () {
                    return eg.API.storage.exists(testpath2);
                })
                .then(function (e) {
                    expect(e).toBe(false);
                    done();
                }).error(function (e) {
                    expect(this).toAutoFail(e);
                });

        });

        it("Can store a file", function (done) {
            var blob = getTestBlob("hey!");

            var fileID;

            eg.API.storage.storeFile(testpath, blob)
                .then(function (e) {
                    fileID = e.id;
                    expect(e.id).toBeTruthy();
                    expect(e.path).toEqual(testpath);
                })
                .then(function () {
                    return eg.API.storage.get(testpath);
                })
                .then(function (e) {
                    expect(e["entry_id"]).toEqual(fileID);
                    expect(e["is_folder"]).toBeFalsy();
                    expect(e["size"] > 0).toBeTruthy();

                    recentFileObject = e;
                    done();
                }).error(function (e) {
                    expect(this).toAutoFail(e);
                });

        });

        it("Can store another version of a file", function (done) {
            var blob = getTestBlob("hey again!");

            eg.API.storage.storeFile(testpath, blob)
                .then(function (e) {
                    expect(e.id).toBeTruthy();
                    expect(e.path).toEqual(testpath);
                })
                .then(function () {
                    return eg.API.storage.get(testpath);
                })
                .then(function (e) {
                    expect(e["entry_id"]).not.toEqual(recentFileObject["entry_id"]);
                    expect(e["versions"]).toBeTruthy();

                    recentFileObject = e;
                    done();
                }).error(function (e) {
                    expect(this).toAutoFail(e);
                });

        });

        it("Can delete a version of a file", function (done) {

            eg.API.storage.removeFileVersion(testpath, recentFileObject.versions[0]["entry_id"])
                .then(function () {
                    return eg.API.storage.get(testpath);
                })
                .then(function (e) {
                    expect(e["versions"]).not.toBeDefined();

                    recentFileObject = e;
                    done();
                }).error(function (e) {
                    expect(this).toAutoFail(e);
                });

        });

        it("Can remove a stored file", function (done) {
            eg.API.storage.remove(testpath)
                .then(function () {
                    return eg.API.storage.exists(testpath);
                })
                .then(function (e) {
                    expect(e).toBe(false);
                    done();
                }).error(function (e) {
                    expect(this).toAutoFail(e);
                });

        });

    });

    describe("Link", function () {
        var recentFile;
        var recentLink;

        it("Needs a file to link to", function (done) {
            var blob = getTestBlob("hey!");

            eg.API.storage.storeFile(testpath3, blob)
                .then(function (e) {
                    recentFile = e;
                    done();
                }).error(function (e) {
                    expect(this).toAutoFail(e);
                });
        });


        it("Can create a link to file", function (done) {

            eg.API.link.createLink({
                path: recentFile.path,
                type: "file",
                accessibility: "password"
            }).then(function (e) {
                expect(e["path"]).toEqual(recentFile.path);
                expect(e["type"]).toEqual("file");
                expect(e.links[0].id).toBeTruthy();
                expect(e.links[0].url).toMatch(/https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/i);
                expect(e["password"]).toBeTruthy();
                recentLink = e;
            }).then(function () {
                return eg.API.link.listLink(recentLink.links[0].id);
            }).then(function (e) {
                expect(e["path"]).toEqual(recentFile.path); //actually checking if it exists
                done();
            }).error(function (e) {
                expect(this).toAutoFail(e);
            });

        });

        it("Can list links and filter the list", function (done) {

            eg.API.link.listLinks({
                path: recentFile.path
            }).then(function (e) {
                expect(e.ids.filter(function (id) {
                    return (id === recentLink.links[0].id);
                }).length).toEqual(1);

                var other = e.ids.filter(function (id) {
                    return (id !== recentLink.links[0].id);
                });
                if (other.length) {
                    eg.API.link.listLink(other[0]).then(function (e) {
                        expect(e["path"]).toEqual(recentFile.path); //actually checking if it exists
                        done();
                    }).error(function (e) {
                        throw new Error("Link from the list doesn't seem to exist at all");
                    });
                } else {
                    done();
                }
            }).error(function (e) {
                expect(this).toAutoFail(e);
            });

        });

        it("Can find one link matching filter", function (done) {

            eg.API.link.findOne({
                path: recentFile.path
            }).then(function (e) {
                expect(e["path"]).toEqual(recentFile.path);
                done();
            }).error(function (e) {
                expect(this).toAutoFail(e);
            });

        });

        it("Can destroy a link to file", function (done) {

            eg.API.link.removeLink(recentLink.links[0].id).then(function (e) {
                expect(e).toEqual(200);
            }).then(function () {
                return eg.API.link.listLink(recentLink.links[0].id);
            }).then(function () {
                //Should not succeed
                expect(this).toAutoFail("Link still exists");
            }, function (result) {
                //I expect a 404 instead
                expect(result.response.statusCode).toEqual(404);
                done();
            });

        });


        it("Needs to clean up the file", function (done) {
            eg.API.storage.remove(testpath3)
                .then(function (e) {
                    done();
                }).error(function (e) {
                    expect(this).toAutoFail(e);
                });
        });

    });
});