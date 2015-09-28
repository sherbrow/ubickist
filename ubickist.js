
(function(bean) {
    function DummyDriver() {
        driver.saveList = function(list, hint) {};
        driver.saveItem = function(item, hint) {};
        driver.savePage = function(page, hint) {};
        driver.deleteList = function(list) {};
        driver.deleteItem = function(item) {};
        driver.load = function(page_id, callback) {};
        driver.loadPages = function(callback) {};
    }
    function LogDriver() {
        var driver = this;
        driver.saveList = function(list, hint) {
            console.log("Saving list "+list.title+" "+list.id+" ("+hint+")");
        };
        driver.saveItem = function(item, hint) {
            console.log("Saving item "+item.text+" "+item.id+" ("+hint+")");
        };
        driver.savePage = function(page, hint) {
            console.log("Saving page "+page.title+" "+page.id+" ("+hint+")");
        };
        driver.deleteList = function(list) {
            console.log("Deleting list "+list.id);
        };
        driver.deleteItem = function(item) {
            console.log("Deleting item "+item.id);
        };
        driver.load = function(page_id, callback) {
            console.log("Loading "+page_id);
        };
        driver.loadPages = function(callback) {
            console.log("Loading pages");
        };
    }
    
    function IDBDriver() {
        var driver = this;
        
        /**
         *  Constructor */
        
        // Your mama inheritance pattern
        var parent = new LogDriver();
        
        var DBNAME = 'ubickist';
        var db = null;
        var dbstores = {
            'items': false,
            'lists': false,
            'pages': false
        };
        var queues = {
            'deleteItem': [],
            'saveItem': [],
            'deleteList': [],
            'saveList': [],
            'savePage': []
        };

        var r = indexedDB.open(DBNAME, 1);
        r.onerror = function(e) { console.log('IDB init error',e); };
        r.onupgradeneeded = function(e) {
            db = e.target.result;
            db.onerror = function(e) { // WET main IDB error handler
                console.log("IDB error: ",e);
            };
            var transactionStorenames = [];
            for(var storename in dbstores) {
                if(!db.objectStoreNames.contains(storename)) {
                    transactionStorenames.push(storename);
                    var store = db.createObjectStore(storename, { keyPath: "id" });
                    if(storename == 'items') store.createIndex("fk_list", "list", { unique: false });
                    else if(storename == 'lists') store.createIndex("fk_page", "page", { unique: false });
                }
            }
            e.target.transaction.oncomplete = function(e) {
                var i_storename;
                while( (i_storename = transactionStorenames.shift()) )
                  bean.fire(driver, 'storecreated', i_storename);
            };
        };
        r.onsuccess = function(e) {
            db = e.target.result;
            db.onerror = function(e) { // WET main IDB error handler
                console.log("IDB error: ",e);
            };
            bean.fire(driver, 'storecreated');
        };
        
        bean.on(driver, 'storecreated', function(storename) {
            var i;
            if(!storename) {
                for(i in dbstores) {
                    dbstores[i] = true;
                }
            }
            else {
                dbstores[storename] = true;
            }
                
            var allready = true;
            for(i in dbstores) {
                if(dbstores[i] === false) {
                    // return; /* for dependant stores (relational DB) */
                    allready = false;
                    break;
                }
                else {
                   // for dependant stores (relational DB) comment the following
                   bean.fire(driver, 'storeready.'+i);
                }
            }
            if(allready) {
                bean.fire(driver, 'storeready.all');
                /* for dependant stores (relational DB)
                for(i in dbstores)
                    bean.fire(driver, 'storeready.'+i);
                bean.fire(driver, 'processQueue'); // processAllQueues
                return;
                */
            }
            
            bean.fire(driver, 'processQueue', storename);
        });
        bean.on(driver, 'processQueue', function(storename) {
            var todostores = {};
            if(storename) todostores[storename]=1;
            else todostores = dbstores;
            
            var storeFct = {
                items: ['saveItem','deleteItem'],
                lists: ['saveList','deleteList'],
                pages: ['savePage']
            };
            for(var i_store in todostores) {
                var fcts = storeFct[i_store];
                if(!fcts) continue;
                var i_elt;
                for(var it_fct=0;it_fct<fcts.length;++it_fct) {
                    var i_fct = fcts[it_fct];
                    while((i_elt = queues[i_fct].shift())) {
                        driver[i_fct](i_elt);
                    }
                }
            }
        });
        
        /* END Constructor */
        
        driver.saveList = function(list, hint) {
            if(!dbstores.lists) {
                for(var i in queues.saveList) {
                    if(queues.saveList[i].id == list.id) {
                        queues.saveList[i] = list;
                        return;
                    }
                }
                queues.saveList.push(list);
                return;
            }
            bean.fire(driver, 'beforeSave', 'list');
            var retval = parent.saveList(list, hint);
            var listStore = db.transaction("lists", "readwrite").objectStore("lists");
            var r = listStore.put(list);
            r.oncomplete = function() {
                bean.fire(driver, 'saveList', list);
            };
            return retval;
 
        };
        driver.saveItem = function(item, hint) {
            if(!dbstores.items) {
                for(var i in queues.saveItem) {
                    if(queues.saveItem[i].id == item.id) {
                        queues.saveItem[i] = item;
                        return;
                    }
                }
                queues.saveItem.push(item);
                return;
            }
            bean.fire(driver, 'beforeSave', 'item');
            var retval = parent.saveItem(item, hint);
            var listStore = db.transaction("items", "readwrite").objectStore("items");
            var r = listStore.put(item);
            return retval;
        };
        driver.savePage = function(page, hint) {
            if(!dbstores.pages) {
                for(var i in queues.savePage) {
                    if(queues.savePage[i].id == page.id) {
                        queues.savePage[i] = page;
                        return;
                    }
                }
                queues.savePage.push(page);
                return;
            }
            bean.fire(driver, 'beforeSave', 'page');
            var retval = parent.savePage(page, hint);
            var pageStore = db.transaction("pages", "readwrite").objectStore("pages");
            var r = pageStore.put(page);
            return retval;
        };
        driver.deleteList = function(list) {
            if(!dbstores.lists) {
                for(var i in queues.deleteList) {
                    if(queues.deleteList[i].id == list.id) {
                        queues.deleteList[i] = list;
                        return;
                    }
                }
                queues.deleteList.push(list);
                return;
            }
            bean.fire(driver, 'beforeDelete', 'list');
            var retval = parent.deleteList(list);
            var listStore = db.transaction("lists", "readwrite").objectStore("lists");
            var r = listStore.delete(list.id);
            return retval;
        };
        driver.deleteItem = function(item) {
            if(!dbstores.items) {
                for(var i in queues.deleteItem) {
                    if(queues.deleteItem[i].id == item.id) {
                        queues.deleteItem[i] = item;
                        return;
                    }
                }
                queues.deleteItem.push(item);
                return;
            }
            bean.fire(driver, 'beforeDelete', 'item');
            var retval = parent.deleteItem(item);
            var itemStore = db.transaction("items", "readwrite").objectStore("items");
            var r = itemStore.delete(item.id);
            return retval;
        };
        driver.load = function(page_id, callback) {
            if(!dbstores.pages || !dbstores.lists || !dbstores.items) {
                bean.one(driver, 'storeready.all', function() {
                    driver.load(page_id, callback);
                });
                return;
            }
            var transaction = db.transaction(["pages","lists","items"], "readonly");
            var pageStore = transaction.objectStore("pages");
            var r = pageStore.get(page_id);
            r.onsuccess = function(e) {
                var page = e.target.result;
                if(page) {
                    var items = [];
                    var lists = [];
                    bean.one(driver, 'loadready', function() {
                        callback({
                            items: items,
                            lists: lists,
                            page: page
                        });
                    });
                    var itemStore = transaction.objectStore("items");
                    var listStore = transaction.objectStore("lists");
                    var listIndexPage = listStore.index('fk_page');
                    var listIds = {};
                    listIndexPage.openCursor(IDBKeyRange.only(page.id)).onsuccess = function(e) {
                        var listCursor = e.target.result;
                        if(listCursor) {
                            var list = listCursor.value;
                            lists.push(list);
                            listIds[list.id] = true; // WHERE IN lists clause values
                            listCursor.continue();
                        }
                        else {
                            /* Instead of chaining cursor walkings
                             * this could fire an event 'listsready'
                             * which would trigger the following code that'd fire 'itemsready'
                             */
                            /* Either it would be assumed to be chained events and 'itemsready' would
                             * fire a 'loadready' event, or both 'listsready' and 'itemsready' would
                             * fire a 'loadcheck' that would keep track of both events and fire
                             * 'loadready' only if both had been fired
                             * this setup is only useful on a list & items async loading and if
                             * items didn't depend on lists (e.g. if item.page were somehow available)
                             */
                            itemStore.openCursor().onsuccess = function(e) {
                                var itemCursor = e.target.result;
                                if(itemCursor) {
                                    var item = itemCursor.value;
                                    if(listIds[item.list]) // WHERE IN lists clause check
                                        items.push(item);
                                    itemCursor.continue();
                                }
                                else {
                                    bean.fire(driver, 'loadready');
                                }
                            };
                        }
                    };
                }
            };
            var retval = parent.load(page_id, callback);
            return retval;
        };
        driver.loadPages = function(callback) {
            if(!dbstores.pages) {
                bean.one(driver, 'storeready.pages', function() {
                    driver.loadPages(callback);
                });
                return;
            }
            var retval = parent.loadPages(callback);
            var pageStore = db.transaction("pages", "readonly").objectStore("pages");
            var pages = [];
            pageStore.openCursor().onsuccess = function(e) {
                var pageCursor = e.target.result;
                if(pageCursor) {
                    var page = pageCursor.value;
                    pages.push(page);
                    pageCursor.continue();
                }
                else {
                  callback(pages);
                  // callback.call(context, [pages]);
                }
            };
            return retval;
        };
    }
    
    var PersistClassAlias = IDBDriver;
    var persist = new PersistClassAlias();
    
    // Namespace leaking
    window.PersistDriver = PersistClassAlias;
    window.persist = persist;
})(bean);


ko.bindingHandlers.textselect = {
    update: function(element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var selected = ko.utils.unwrapObservable(valueAccessor());
        if(selected) element.select();
    }
};

(function(ko, dragula, persist, bean) {

    var settings = {
        rootViewModel: '#global',
        rootDragula: '#page',
        prependPosition: false
    };
    
    var guidIndex = [];
    
    function randomGuid(obj) {
        var id = Math.floor((1 + Math.random()) * 0x100000000)
      .toString(16).slice(1)+Math.floor((1 + Math.random()) * 0x100000000).toString(16).slice(1);
        guidIndex[id] = obj;
        return id;
    }

    function UbickistModel() {
        var self = this;
        
        self.page = ko.observable(null);
        self.pages = ko.observableArray([]);
        
        self.getPageTitle = function(i) {
            if(!i.title) return '(untitled)';
            return i.title;
        };
        
        
        self.loadPages = function() {
            persist.loadPages(function(pages) {
                self.pages.splice(0);
                for(var i=0;i<pages.length;++i) {
                    self.pages.push(pages[i]);
                }
            });
        };
        
        self.newPage = function() {
            var page = new PageModel();
            bean.one(persist, 'beforeSave.newPage', function(type) {
                if(type != 'page') { // no need to save what's being saved
                    persist.savePage(page.exportPage());
                }
                self.loadPages();
            });
            self.page(page);
        };
        
        self.loadPage = function(data, e) {
            bean.off(persist, 'beforeSave.newPage');
            var page_id = data.id;
            persist.load(page_id, function(data) {
                var page = new PageModel(data.page);
                page.import(data);
                self.page(page);
                // OR
                // self.page().import(data);
            });
        };
        
        self.page.subscribe(function(page) {
            // If title changes, reload pages
            page.title.subscribe(function() {
                self.loadPages();
            });
        });
        
        
        self.loadPages();
    }
    function PageModel(hydration) {
        var self = this;
        if(!hydration) hydration = {};
        var timeoutHandle = false;


        self.orderLists = function() {
            self.lists.sort(function(a, b) {
                // var order = a.position() - b.position();
                var order = a.title().localeCompare(b.title(), [], {sensitivity: 'base', numeric: true});
                return order;
            });
        };

        self.id = hydration.id || randomGuid(self);
        self.title = ko.observable(hydration.title || '');
        self.lists = ko.observableArray([]);
        self.ordering = ko.observable(hydration.ordering || false);
        self.settings = {
            persisting: true,
            prependPosition: ko.observable(settings.prependPosition),
            debug: ko.observable(settings.debug)
        };
        self.creating = ko.observable(false);
        self.creatingTitle = ko.observable('');
        self.hasFocus = ko.observable(false);

        self.getTitle = ko.computed(function() {
            if(!self.title()) return '(untitled)';
            return self.title();
        });
        
        self.createSubmit = function() {
            var title = self.creatingTitle();
            if(!title) return;
            self.creatingTitle('');
            self.pushList(new ListModel({title: title}));
            self.creating(false);
        };
        
        self.export = function() {
            var data = {lists: [], items: [], page: self.exportPage()};
            var lists = self.lists();
            for(var i=0;i<lists.length;++i) {
                var i_list = lists[i];
                data.lists.push(i_list.export());
                var i_items = i_list.items();
                for(var ii=0;ii<i_items.length;++ii) {
                    var i_item = i_items[ii];
                    data.items.push(i_item.export());
                }
            }
            return data;
        };
        self.exportPage = function() {
            return {
                id: self.id,
                title: self.title()
            };
        };
        self.import = function(data) {
            self.settings.persisting = false;
            self.lists.splice(0);
            // Changing ID of object means guidIndex is not coherent anymore
            self.id = data.page.id;
            self.title(data.page.title);
            var d_lists = data.lists;
            for(var i=0;i<d_lists.length;++i) {
                var d_list = d_lists[i];
                d_list.pageObject = self;
                var i_list = new ListModel(d_list);
                var i_position = i_list.position();
                if(i_position === 0 || i_position > 0) // WET valid position
                    self.lists.splice(i_position, 0, i_list);
                else
                    self.lists.push(i_list);
            }
            
            var d_items = data.items;
            for(var ii=0;ii<d_items.length;++ii) {
                var d_item = d_items[ii];
                var ii_list = guidIndex[d_item.list];
                d_item.listObject = ii_list;
                var i_item = new ItemModel(d_item);
                var ii_position = i_item.position();
                if(ii_position === 0 || ii_position > 0) // WET valid position
                    ii_list.items.splice(ii_position, 0, i_item);
                else
                    ii_list.items.push(i_item);
            }
            var lists = self.lists();
            for(i=0;i<lists.length;++i)
                lists[i].orderItems();
            
            self.settings.persisting = true;
        };
        self.serialize = function() {
            return JSON.stringify(self.export());
        };
        self.unserialize = function(serial) {
            return self.import(JSON.parse(serial));
        };
        self.koserialize = ko.computed(function(){return self.serialize();});
        
        self.pushList = function(list) {
            var objectList = list;
            if(!(list instanceof ListModel)) {
                objectList = new ListModel(list);
            }
            objectList.setPage(self);
            self.lists.push(objectList);
            if(self.settings.persisting) {
                var plainList = objectList.export(); // After list insertion to get parent page id properly
                persist.saveList(plainList);
            }
            return self;
        };
        
        self.removeList = function(list) {
            self.lists.remove(list);
            // TODO restack positions
            if(self.settings.persisting) { // Default should trigger persist
                persist.deleteList(list);
            }
            list.deleted = true; // Experimental
            return self;
        };

        self.lists.subscribe(function(lists) {
            for(var i=0;i<lists.length;++i) {
                var i_list = lists[i];
                i_list.setPage(self);
                var i_position = i_list.position();
                if( ! (i_position === 0 || i_position > 0)) // WET valid position
                    i_list.position(i);
            }
        });
        self.title.subscribe(function(position) {
            if(self.settings.persisting)
                persist.savePage(self.exportPage(), 'title');
        });
        self.hasFocus.subscribe(function(hasFocus) {
            if(timeoutHandle) clearTimeout(timeoutHandle);
            if(!hasFocus)
                timeoutHandle = setTimeout(function() {self.creating(hasFocus);},1000);
            else
                self.creating(hasFocus);
        });
    }
    function ListModel(hydration) {
        var self = this;
        if(!hydration) hydration = {};
        var timeoutHandle = false;

        var items = [];
        if(undefined !== arguments[1]) {
            items = arguments[1];
        }


        self.orderItems = function() {
            self.items.sort(function(a, b) {
                var order = a.position() - b.position();
                return order;
            });
        };

        self.id = hydration.id || randomGuid(self);
        guidIndex[self.id] = self;
        self.title = ko.observable(hydration.title || '');
        self.items = ko.observableArray(items);
        self.position = ko.observable(hydration.position); // 0 is valid, null or undefined means push
        self.adding = ko.observable(false);
        self.addingText = ko.observable('');
        self.hasFocus = ko.observable(false);
        self.editing = ko.observable(false);
        self.editingTitle = ko.observable(self.title());
        self.titleselect = ko.observable(false);
        
        var page = ko.observable();
        self.getPage = function() { return page(); };
        self.setPage = function(i) { page(i); };
        if(hydration.pageObject) page(hydration.pageObject);

        self.getTitle = ko.computed(function() {
            if(self.getPage() && self.getPage().settings.prependPosition())
                return self.position() + ' ' + self.title();
            return self.title();
        });
        
        self.addSubmit = function() {
            var text = self.addingText();
            if(!text) return;
            self.addingText('');
            self.pushItem(new ItemModel({text: text, checked: false}));
            self.adding(false);
        };
        
        self.pushItem = function(item) {
            var objectItem = item;
            if(!(item instanceof ItemModel)) {
                objectItem = new ItemModel(item);
            }
            objectItem.setList(self);
            self.items.push(objectItem);
            if(!self.getPage() || self.getPage().settings.persisting) { // Default should trigger persist
                var plainItem = item.export(); // After items insertion to get parent list id properly
                persist.saveItem(plainItem);
            }
            return self;
        };
        
        self.removeItem = function(item, event) {
            self.items.remove(item);
            // TODO restack positions
            if(!self.getPage() || self.getPage().settings.persisting) { // Default should trigger persist
                persist.deleteItem(item);
            }
            item.deleted = true; // Experimental
            return self;
        };
        
        self.removeSelf = function() {
            self.getPage().removeList(self);
        };
        self.toggleEditing = function() {
            var editing = self.editing();
            self.editing(!editing);
        };
        
        self.editSubmit = function() {
            var title = self.editingTitle();
            if(!title) return;
            self.title(title);
            self.editingTitle(self.title());
            self.editing(false);
        };

        self.items.subscribe(function(items) {
            for(var i=0;i<items.length;++i) {
                var i_item = items[i];
                i_item.setList(self);
                var i_position = i_item.position();
                if( ! (i_position === 0 || i_position > 0)) // WET valid position
                    i_item.position(i);
            }
        });
        self.position.subscribe(function(position) {
            if(!self.getPage() || self.getPage().settings.persisting)
                persist.saveList(self.export(), 'position');
        });
        self.title.subscribe(function(title) {
            if(!self.getPage() || self.getPage().settings.persisting)
                persist.saveList(self.export(), 'title');
            if(!self.editing())
                self.editingTitle(self.title());
        });
        
        self.hasFocus.subscribe(function(hasFocus) {
            if(timeoutHandle) clearTimeout(timeoutHandle);
            if(!hasFocus)
                timeoutHandle = setTimeout(function() {self.adding(hasFocus);},1000);
            else
                self.adding(hasFocus);
        });
        self.editing.subscribe(function(editing) {
                 self.titleselect(editing);
        });
        
        self.export = function() {
            return {
                id: self.id,
                title: self.title(),
                position: self.position(),
                page: page().id
            };
        };
    }
    function ItemModel(hydration) {
        var self = this;

        self.id = hydration.id || randomGuid(self);
        guidIndex[self.id] = self;
        self.text = ko.observable(hydration.text || '');
        self.checked = ko.observable(hydration.checked || false);
        self.position = ko.observable(hydration.position); // 0 is valid, null or undefined means push
        self.editing = ko.observable(false);
        self.editingText = ko.observable(self.text());
        self.textselect = ko.observable(false);
        
        var list = ko.observable();
        self.getList = function() { return list(); };
        self.setList = function(i) { list(i); };
        self.getPage = function() { if(list()) return list().getPage(); return null; };
        
        if(hydration.listObject) list(hydration.listObject);
        
        self.removeSelf = function() {
            self.getList().removeItem(self);
            console.log(event.target);
            event.target.remove();
        };
        self.toggleEditing = function() {
            var editing = self.editing();
            self.editing(!editing);
        };
        
        self.editSubmit = function() {
            var text = self.editingText();
            if(!text) return;
            self.text(text);
            self.editingText(self.text());
            self.editing(false);
        };

        self.getText = ko.computed(function() {
            if(self.getPage() && self.getPage().settings.prependPosition())
                return self.position() + ' ' + self.text();
            return self.text();
        });
        
        self.position.subscribe(function(position) {
            if(!self.getPage() || self.getPage().settings.persisting)
                persist.saveItem(self.export(), 'position');
        });
        self.checked.subscribe(function(checked) {
            if(!self.getPage() || self.getPage().settings.persisting)
                persist.saveItem(self.export(), 'checked');
        });
        self.text.subscribe(function(text) {
            if(!self.getPage() || self.getPage().settings.persisting)
                persist.saveItem(self.export(), 'text');
            if(!self.editing())
                self.editingText(self.text());
        });
        self.editing.subscribe(function(editing) {
                 self.textselect(editing);
        });
        
        
        self.export = function() {
            return {
                id: self.id,
                text: self.text(),
                checked: self.checked(),
                position: self.position(),
                list: list().id
            };
        };
    }
    
    var vm = new UbickistModel();
    vm.newPage();
    ko.applyBindings(vm, document.querySelector(settings.rootViewModel));
    
    var $page = document.querySelector(settings.rootDragula);
    var drake_lists = dragula([$page], {
        moves: function(el, ctn, target) {
            return target.classList.contains('listdraghandle');
        }
    });

    drake_lists.on('drop', function(el, container) {
        var siblings = container.children;

        for(var i=0; i<siblings.length; ++i) {
            var i_el = siblings[i];
            var i_vm = ko.dataFor(i_el);
            if(i_el.getAttribute('data-list-position') != i) {
                i_vm.position(i);
            }
        }
        vm.page().orderLists();
    });

    var drake_items = dragula({
        isContainer: function (el) {
            return el.classList.contains('items');
        },
        moves: function(el, ctn, target) {
            return target.classList.contains('itemdraghandle');
        }
    });

    drake_items.on('drop', function(el, source, target) {
        var batch = [target];
        if(source != target) batch.push(source);
        for(var ib=0; ib<batch.length;++ib) {
            var container = batch[ib];
            var siblings = container.children;
            var vmlist = ko.dataFor(container);
            for(var i=0; i<siblings.length; ++i) {
                var i_el = siblings[i];
                var i_vm = ko.dataFor(i_el);
                if(i_el.getAttribute('data-item-position') != i) {
                    i_vm.position(i);
                }
            }
            vmlist.orderItems();
        }
    });
    
    // The following class should use events not **** trait inheritance damn'it !
    function LastUsedTrait(vm, driver) {
        
        var self = this;
        
        self.saveLastUsed = function(page_id) {
            console.log("Saving last used "+page_id);
            localStorage.setItem('ubickist_lastUsed', page_id);
        };
        
        self.loadLastUsed = function() {
            var page_id = null;
            page_id = localStorage.getItem('ubickist_lastUsed');
            if(!page_id) return;
            console.log("Loading last used "+page_id);
            vm.loadPage({id: page_id});
        };
        
        self.applyTrait = function(driver) {
            var orgn_savePage = driver.savePage;
            driver.savePage = function(page) {
                orgn_savePage.apply(this, arguments);
                self.saveLastUsed(page.id);
            };
            var orgn_load = driver.load;
            driver.load = function(page_id) {
                orgn_load.apply(this, arguments);
                self.saveLastUsed(page_id);
            };
        };
        
        self.applyTrait(driver);
    }
    var lastUsedTrait = new LastUsedTrait(vm, persist);
    
    
    // Seeding
    var seed = function(ubickist) {
        if(!ubickist.global.page().title())
            ubickist.global.page().title('Ubickist');
        
        for(var i in {'Flaveolum': 1, 'Flatworm': 1, 'Pomatia': 1, 'Cyanzus': 1, 'Tiger': 1})
          ubickist.global.page().pushList(new ubickist.ListModel({title: i}));
        
        var lists = ubickist.global.page().lists();
        lists.forEach(function(i_list) {
            for(var i in {'head': 1, 'tail': 1, 'fur': 1}) {
                i_list.pushItem(new ubickist.ItemModel({text: i, checked: !!Math.round(Math.random())}));
            }
        });
    };
    
    var ubickist = {
        PageModel: PageModel,
        ListModel: ListModel,
        ItemModel: ItemModel,
        seed: function() { seed(ubickist); },
        loadLastUsed: function() { lastUsedTrait.loadLastUsed(); },
        global: vm,
        guidIndex: guidIndex,
        drake: {
            lists: drake_lists,
            items: drake_items
        }
    };

    // Namespace leaking
    window.ubickist = ubickist;
})(ko, dragula, persist, bean);

ubickist.loadLastUsed();

// ubickist.seed();

/*
ubickist.global.page().title("Ubickist "+(new Date().getTime()));
var lm = new ubickist.ListModel({title: 'This'});
ubickist.global.page().pushList(lm);
lm.pushItem(new ubickist.ItemModel({text: 'Item pos tracking', checked: true}));
lm.pushItem(new ubickist.ItemModel({text: 'List position auto increment (or auto order on push)', checked: true}));
lm.pushItem(new ubickist.ItemModel({text: 'Local saving/restoring', checked: false}));
lm.pushItem(new ubickist.ItemModel({text: 'Remote saving/restoring', checked: false}));
lm.pushItem(new ubickist.ItemModel({text: 'API', checked: false}));
lm.pushItem(new ubickist.ItemModel({text: 'Options (local lists, api, themes)', checked: false}));
*/

// ubickist.global.unserialize(ubickist.global.serialize());