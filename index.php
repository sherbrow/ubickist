<!DOCTYPE html>
<!-- <html manifest="manifest.appcache"> -->
<html>
<head>
    <link href="https://cdnjs.cloudflare.com/ajax/libs/normalize/3.0.3/normalize.min.css" type="text/css" rel="stylesheet">
    <link href="dragula.min.css" type="text/css" rel="stylesheet">
    <link href='https://fonts.googleapis.com/css?family=Roboto:700|Orbitron:700|Noto Sans' rel='stylesheet' type='text/css'>
    <!-- <link href="ubickist.css" type="text/css" rel="stylesheet"> -->
    <link href="ubickist.less" type="text/css" rel="stylesheet/less">
  <meta charset="utf-8">
  <title>Ubickist</title>
</head>
<body class="row vertical" id="global">
    <header>
        <menu id="menu" class="row">
            <span class="brand menu-item" type="button">Ubickist</span>
            <div class="menu-container">
                <button class="menu-item"><span style="transform: rotate(180deg);display: inline-block;" title="menu">⌆</span> Page</button>
                <menu class="row vertical">
                    <button class="menu-item" type="button" data-bind="click: newPage">✴ New page</button>
                    <button class="menu-item" type="button" data-bind="click: newPage">📂 Open page</button>
                    <button class="menu-item" type="button" data-bind="click: loadPages">🔃 Reload pages</button>
                </menu>
            </div>
            
            <button class="menu-item" type="button">🔧 Options</button>
        </menu>
        <ul class="menu-pages row wrap">
            <!-- ko template: { name: 'template-menu-page', foreach: pages, as: 'i_page' } -->
        <!-- /ko -->
        </ul>
        <ul class="menu-options row wrap">
            
        </ul>
        <script type="text/html" id="template-menu-page">
            <li class="col menu-page">
                <a href="#" data-bind="{attr: { 'data-page-id': i_page.id, 'href': '#'+i_page.id}, click: $parent.loadPage }">📄 <!-- ko text: $parent.getPageTitle(i_page) --><!-- /ko --></a></label>
            </li>
        </script>
    </header>
    <section data-bind="template: { name: 'template-page', data: page, as: 'page' }"></section>
    <script type="text/html" id="template-page">
        <h1 class="title"><!-- ko text: getTitle --><!-- /ko --></h1>
        <div class="row wrap" id="page" data-bind="template: { name: 'template-list', foreach: lists, as: 'i_list' }"></div>
            <div class="col list list-create" data-bind="css: { notcreating: !creating()}">
                <form class="row title-row" data-bind="submit: createSubmit"><input class="col title-style" type="text" data-bind="hasFocus: hasFocus, value: creatingTitle"><button class="">Create</button></form>
            </div>
        <div id="options">
            <label> <input type="checkbox" data-bind="checked: ordering"> Reorder</label>
            <label> <input type="checkbox" data-bind="checked: settings.prependPosition"> Prepend position</label>
            <label> <input type="checkbox" data-bind="checked: settings.debug"> Debug</label>
        </div>
        <div class="col row" data-bind="visible: settings.debug">
            <textarea class="col" rows="9" data-bind="value: koserialize"></textarea>
        </div>
    </script>
    <script type="text/html" id="template-list">
        <div class="col list" data-bind="attr: { 'data-list-position': position }">
            <div class="row title-row" data-bind="css: { editing: editing }"><h2 class="col title"><span class="draghandle listdraghandle" data-bind="visible: page.ordering">↕</span> <span ><!-- ko text: getTitle --><!-- /ko --></span></h2>
            <div class="col list-editing" data-bind="attr: {id: 'editlistbox_'+id}"><form class="row " data-bind="submit: editSubmit"><input class="col title-style" type="text" data-bind="value: editingTitle, textselect: titleselect"><button>Save</button><button type="button" data-bind="click: toggleEditing">Cancel</button></form></div>
            <label class="adding"><input type="checkbox" readonly="readonly" data-bind="checked: adding"></label>
            <div class="list-btn list-edit"><button type="button" data-bind="click: toggleEditing">✎</button></div><div class="list-btn list-del"><button type="button" data-bind="click: removeSelf">&times;</button></div></div>
            <hr>
            <ul class="items row vertical"><!-- ko template: { name: 'template-item', foreach: items, as: 'i_item' } -->
            <!-- /ko -->
            </ul>
            <div class="col item item-add" data-bind="css: { notadding: !adding()}, attr: {id: 'addbox_'+id}"><form class="row " data-bind="submit: addSubmit"><!-- <input type="checkbox"> --><input class="col" type="text" data-bind="hasFocus: hasFocus, value: addingText"><button>Add</button></form></div>
        </div>
    </script>
    <script type="text/html" id="template-item">
        <li class="col row item-row" data-bind=" css: { editing: editing }">
            <label class="col row item" data-bind="attr: { 'data-item-position': position }"><input type="checkbox" data-bind="checked: checked"><span class="draghandle itemdraghandle" data-bind="visible: page.ordering">↕</span>&nbsp;<span data-bind="text: getText"></span></label>
            <div class="col item-editing" data-bind="attr: {id: 'edititembox_'+id}"><form class="row " data-bind="submit: editSubmit"><input class="col" type="text" data-bind="value: editingText, textselect: textselect"><button>Save</button><button type="button" data-bind="click: toggleEditing">Cancel</button></form></div>
            <div class="item-btn item-edit"><button type="button" data-bind="click: toggleEditing">✎</button></div><div class="item-btn item-del"><button type="button" data-bind="click: removeSelf">&times;</button></div>
        </li>
    </script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/knockout/3.3.0/knockout-min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/bean/1.0.15/bean.min.js"></script>
    <script src="dragula.min.js"></script>
    <script src="//cdnjs.cloudflare.com/ajax/libs/less.js/2.5.3/less.min.js"></script>
    <script src="ubickist.js"></script>
</body>
</html>