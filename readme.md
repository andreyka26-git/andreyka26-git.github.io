# Commands

```
bundle exec jekyll serve

jekyll build --verbose

jekyll serve
```

# Create new post

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