# Commands

## OPTIMIZED DEVELOPMENT COMMANDS (Use these for faster builds!)

### Fast Development Build (Recommended - ~30-60 seconds)
```
bundle exec jekyll serve --config _config.yml,_config_dev.yml --incremental
```

### Ultra Fast Build (Only latest 3 posts - ~15-30 seconds) 
```
bundle exec jekyll serve --config _config.yml,_config_dev.yml --incremental --limit_posts 3
```

### Standard Development Build (All posts - slower but complete)
```
bundle exec jekyll serve --incremental
```

## ORIGINAL COMMANDS (Slower)

```
bundle exec jekyll serve

jekyll build --verbose

jekyll serve
```

## PRODUCTION/FULL BUILD COMMANDS

### Production Build (Full build for testing)
```
bundle exec jekyll build
```

### Clean and rebuild everything
```
bundle exec jekyll clean && bundle exec jekyll serve --config _config.yml,_config_dev.yml --incremental
```


# Create new post

## Generate .md


## Agenda

1. Check '\' does not exist
2. Images path changing + adding `<a>` link
3. Add ** to headings
4. Add square and rectangle image

## Check '\\' does not exist

## Regex for images path change

```
images/
/assets/nameofarticle/
```

## Regex for images to make links

```
(!\[alt_text\]\((.+)\))
or
(!\[Untitled\]\((.+)\))

[$1]($2){:target="_blank"}
```


## Regex for changing heading to bold

```
(#+) (.+)
$1 **$2**
```

## Regex for new line before header

```
(#+ \*\*.+\*\*)


<br>

$1
```


## Regex to fix markdown symbols

```
&lt;
<
```


# Fixing regex


## Regex to change images to open in new tab

```
(\[!\[.*?\)\]\(.*?\))
$1{:target="_blank"}
```

## Regex for changing bold to code

```
\*\*(.+?)\*\*
`$1`
```